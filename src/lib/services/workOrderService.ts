import pool from "@/lib/db";
import { PoolClient } from "pg";
import { AppError } from "@/lib/errors";

export async function completeWorkOrder(workOrderId: string, externalClient?: PoolClient) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (shouldManageTransaction) await client.query("BEGIN");

    const opCheck = await client.query(
      "SELECT count(*) FROM work_order_operations WHERE work_order_id = $1 AND status != 'Tamamland\u0131'",
      [workOrderId]
    );

    if (Number(opCheck.rows[0].count) > 0) {
      throw new AppError("Tüm operasyon adımları tamamlanmadan iş emri kapatılamaz.", 400);
    }

    const updateResult = await client.query(
      "UPDATE work_orders SET status = 'Tamamland\u0131' WHERE id = $1 AND status != 'Tamamland\u0131'",
      [workOrderId]
    );

    if (updateResult.rowCount === 0) {
      throw new AppError("İş emri bulunamadı veya zaten tamamlanmış.", 404);
    }

    await client.query(
      "INSERT INTO quality_controls (work_order_id, status, notes) VALUES ($1, 'Karantinada', 'Üretim tamamlandı, kontrol bekleniyor.')",
      [workOrderId]
    );

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, message: "İş emri tamamlandı ve kalite karantinasına alındı." };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

export async function advanceOperation(workOrderId: string, externalClient?: PoolClient) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (shouldManageTransaction) await client.query("BEGIN");

    const woCheck = await client.query(
      "SELECT status FROM work_orders WHERE id = $1",
      [workOrderId]
    );

    if (woCheck.rows.length === 0) {
      throw new AppError("İş emri bulunamadı.", 404);
    }

    if (woCheck.rows[0].status === "Malzeme Bekliyor") {
      throw new AppError("İş emri 'Malzeme Bekliyor' statüsünde. Operasyon ilerletilemez.", 400);
    }

    const result = await client.query(
      `
      UPDATE work_order_operations
      SET status = 'Tamamlandı'
      WHERE id = (
        SELECT id FROM work_order_operations
        WHERE work_order_id = $1 AND status = 'Bekliyor'
        ORDER BY step_order ASC
        LIMIT 1
      )
      RETURNING *
    `,
      [workOrderId]
    );

    if (result.rows.length === 0) {
      throw new AppError("Bekleyen operasyon adımı bulunamadı.", 404);
    }

    await client.query(
      "UPDATE work_orders SET status = '\u00DCretimde' WHERE id = $1 AND status = 'Planland\u0131'",
      [workOrderId]
    );

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, message: "Operasyon adımı başarıyla tamamlandı." };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

export async function createWorkOrder(itemId: string, targetQuantity: number, salesOrderId?: string | null, externalClient?: PoolClient, ignoreStockCheck: boolean = false) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (targetQuantity <= 0) {
      throw new AppError("Hedef miktar 0 veya daha küçük olamaz.", 400);
    }

    if (shouldManageTransaction) await client.query("BEGIN");

    const itemCheck = await client.query("SELECT id FROM items WHERE id = $1", [itemId]);
    if (itemCheck.rowCount === 0) {
      throw new AppError("Geçersiz ürün ID.", 404);
    }

    const bomCheck = await client.query(
      "SELECT raw_material_id, quantity FROM bill_of_materials WHERE product_id = $1",
      [itemId]
    );

    if (bomCheck.rows.length === 0) {
      throw new AppError("Bu ürün için reçete (BOM) tanımlanmamış, iş emri açılamaz.", 400);
    }

    const missingMaterials = [];
    const deductions = [];

    for (const bom of bomCheck.rows) {
      const requiredQty = bom.quantity * targetQuantity;
      const stockCheck = await client.query(
        "SELECT id, name, stock, min_stock, type, auto_order_quantity FROM items WHERE id = $1",
        [bom.raw_material_id]
      );

      if (stockCheck.rows.length > 0) {
        const item = stockCheck.rows[0];
        if (item.stock < requiredQty) {
          missingMaterials.push({
            name: item.name,
            required: requiredQty,
            current: item.stock,
          });
        } else {
          deductions.push({
            id: item.id,
            newStock: item.stock - requiredQty,
            minStock: item.min_stock,
            deducted: requiredQty,
            type: item.type,
            autoOrderQty: item.auto_order_quantity,
          });
        }
      }
    }

    if (missingMaterials.length > 0) {
      if (ignoreStockCheck) {
        const woResult = await client.query(
          "INSERT INTO work_orders (item_id, target_quantity, status, sales_order_id) VALUES ($1, $2, 'Malzeme Bekliyor', $3) RETURNING id",
          [itemId, targetQuantity, salesOrderId || null]
        );
        const newWoId = woResult.rows[0].id;

        const operations = [
          { step: 1, name: "Kesim/Hazırlık" },
          { step: 2, name: "Montaj" },
          { step: 3, name: "Paketleme" },
        ];

        for (const op of operations) {
          await client.query(
            "INSERT INTO work_order_operations (work_order_id, operation_name, step_order, status) VALUES ($1, $2, $3, 'Bekliyor')",
            [newWoId, op.name, op.step]
          );
        }

        if (shouldManageTransaction) await client.query("COMMIT");
        return { success: true, message: "Malzeme yetersiz olduğu için iş emri 'Malzeme Bekliyor' statüsünde oluşturuldu.", id: newWoId };
      } else {
        throw new AppError("Yetersiz hammadde stoku", 400, { missingMaterials });
      }
    }

    const woResult = await client.query(
      "INSERT INTO work_orders (item_id, target_quantity, status, sales_order_id) VALUES ($1, $2, 'Planland\u0131', $3) RETURNING id",
      [itemId, targetQuantity, salesOrderId || null]
    );
    const newWoId = woResult.rows[0].id;

    for (const deduction of deductions) {
      await client.query("UPDATE items SET stock = $1 WHERE id = $2", [
        deduction.newStock,
        deduction.id,
      ]);

      await client.query(
        "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, '\u00C7\u0131k\u0131\u015F', $3, $4)",
        [deduction.id, -deduction.deducted, `\u0130\u015F Emri \u00DCretim T\u00FCketimi (${newWoId})`, deduction.newStock]
      );

      if (deduction.newStock < deduction.minStock) {
        if (deduction.type === 'hammadde') {
          const orderQty = deduction.autoOrderQty || 50;

          const existingPo = await client.query(
            "SELECT id FROM purchase_orders WHERE item_id = $1 AND status = 'Bekliyor'",
            [deduction.id]
          );

          if (existingPo.rows.length === 0) {
            await client.query(
              "INSERT INTO purchase_orders (item_id, quantity, status) VALUES ($1, $2, 'Bekliyor')",
              [deduction.id, orderQty]
            );
          }
        } else if (deduction.type === 'son_urun') {
          const existingWo = await client.query(
            "SELECT id FROM work_orders WHERE item_id=$1 AND status != 'Tamamland\u0131'",
            [deduction.id]
          );

          if (existingWo.rows.length === 0) {
            const woRes = await client.query(
              "INSERT INTO work_orders (item_id, target_quantity, status) VALUES ($1, $2, 'Planland\u0131') RETURNING id",
              [deduction.id, deduction.minStock || 10]
            );
            const wId = woRes.rows[0].id;

            const ops = [
              { step: 1, name: "Kesim/Haz\u0131rl\u0131k" },
              { step: 2, name: "Montaj" },
              { step: 3, name: "Paketleme" },
            ];

            for (const op of ops) {
              await client.query(
                "INSERT INTO work_order_operations (work_order_id, operation_name, step_order, status) VALUES ($1, $2, $3, 'Bekliyor')",
                [wId, op.name, op.step]
              );
            }
          }
        }
      }
    }

    const operations = [
      { step: 1, name: "Kesim/Haz\u0131rl\u0131k" },
      { step: 2, name: "Montaj" },
      { step: 3, name: "Paketleme" },
    ];

    for (const op of operations) {
      await client.query(
        "INSERT INTO work_order_operations (work_order_id, operation_name, step_order, status) VALUES ($1, $2, $3, 'Bekliyor')",
        [newWoId, op.name, op.step]
      );
    }

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, message: "İş emri oluşturuldu.", id: newWoId };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

export async function checkAndReleaseWaitingWorkOrders(externalClient?: PoolClient) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (shouldManageTransaction) await client.query("BEGIN");

    const waitingWosRes = await client.query(
      "SELECT id, item_id, target_quantity FROM work_orders WHERE status = 'Malzeme Bekliyor' ORDER BY created_at ASC"
    );

    for (const wo of waitingWosRes.rows) {
      const bomCheck = await client.query(
        "SELECT raw_material_id, quantity FROM bill_of_materials WHERE product_id = $1",
        [wo.item_id]
      );

      let canFulfill = true;
      const deductions = [];

      for (const bom of bomCheck.rows) {
        const requiredQty = bom.quantity * wo.target_quantity;
        const stockCheck = await client.query(
          "SELECT stock FROM items WHERE id = $1",
          [bom.raw_material_id]
        );
        if (stockCheck.rows.length > 0 && stockCheck.rows[0].stock >= requiredQty) {
          deductions.push({
            id: bom.raw_material_id,
            qty: requiredQty
          });
        } else {
          canFulfill = false;
          break;
        }
      }

      if (canFulfill) {
        for (const deduction of deductions) {
          const updatedStockRes = await client.query(
            "UPDATE items SET stock = stock - $1 WHERE id = $2 RETURNING stock",
            [deduction.qty, deduction.id]
          );
          const newStock = updatedStockRes.rows[0].stock;

          await client.query(
            "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, '\u00C7\u0131k\u0131\u015F', $3, $4)",
            [deduction.id, -deduction.qty, `\u0130\u015F Emri \u00DCretim T\u00FCketimi (Gecikmeli, WO: ${wo.id})`, newStock]
          );
        }

        await client.query(
          "UPDATE work_orders SET status = 'Planland\u0131' WHERE id = $1",
          [wo.id]
        );

        await client.query(
          "UPDATE sales_orders SET status = '\u00DCretim Planland\u0131' WHERE id = (SELECT sales_order_id FROM work_orders WHERE id = $1) AND status = 'Malzeme Bekliyor'",
          [wo.id]
        );
      }
    }

    if (shouldManageTransaction) await client.query("COMMIT");
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}
