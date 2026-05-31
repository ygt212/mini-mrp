import pool from "@/lib/db";
import { PoolClient } from "pg";
import { AppError } from "@/lib/errors";

export async function consumeItem(itemId: string, amount: number, externalClient?: PoolClient) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (shouldManageTransaction) await client.query("BEGIN");

    const checkResult = await client.query(
      "SELECT stock, min_stock FROM items WHERE id = $1",
      [itemId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError("Ürün bulunamadı.", 404);
    }

    const currentStock = checkResult.rows[0].stock;

    if (amount > currentStock) {
      throw new AppError("Yetersiz stok.", 400);
    }

    await client.query("UPDATE items SET stock = stock - $1 WHERE id = $2", [
      amount,
      itemId,
    ]);

    await client.query(
      "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, '\u00C7\u0131k\u0131\u015F', 'Manuel T\u00FCketim', $3)",
      [itemId, -amount, currentStock - amount]
    );

    const result = await client.query(
      "SELECT stock, min_stock, type, auto_order_quantity FROM items WHERE id = $1",
      [itemId]
    );

    const { stock, min_stock, type, auto_order_quantity } = result.rows[0];
    let replenishmentType = null;

    if (stock < min_stock) {
      if (type === 'hammadde') {
        const existingOrder = await client.query(
          "SELECT id FROM purchase_orders WHERE item_id = $1 AND status = 'Bekliyor' LIMIT 1",
          [itemId]
        );

        if (existingOrder.rows.length === 0) {
          await client.query(
            "INSERT INTO purchase_orders (item_id, quantity, status) VALUES ($1, $2, 'Bekliyor')",
            [itemId, auto_order_quantity || 50]
          );
          replenishmentType = 'buy';
        }
      } else if (type === 'son_urun') {
        const targetQuantity = min_stock - stock;
        
        if (targetQuantity > 0) {
          const existingWo = await client.query(
            "SELECT id FROM work_orders WHERE item_id=$1 AND status != 'Tamamland\u0131' LIMIT 1",
            [itemId]
          );
          
          if (existingWo.rows.length === 0) {
            const bomCheck = await client.query(
              "SELECT raw_material_id, quantity FROM bill_of_materials WHERE product_id = $1",
              [itemId]
            );

            if (bomCheck.rows.length === 0) {
              throw new AppError("Bu ürün için reçete (BOM) tanımlanmamış.", 400);
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
              throw new AppError("Yetersiz hammadde stoku", 400, { missingMaterials });
            }

            for (const deduction of deductions) {
              await client.query("UPDATE items SET stock = $1 WHERE id = $2", [
                deduction.newStock,
                deduction.id,
              ]);

              await client.query(
                "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, '\u00C7\u0131k\u0131\u015F', 'Otomatik \u00DCretim T\u00FCketimi', $3)",
                [deduction.id, -deduction.deducted, deduction.newStock]
              );
            }

            const woRes = await client.query(
              "INSERT INTO work_orders (item_id, target_quantity, status) VALUES ($1, $2, 'Planland\u0131') RETURNING id",
              [itemId, targetQuantity]
            );
            const woId = woRes.rows[0].id;
            
            const operations = [
              { step: 1, name: "Kesim/Haz\u0131rl\u0131k" },
              { step: 2, name: "Montaj" },
              { step: 3, name: "Paketleme" },
            ];

            for (const op of operations) {
              await client.query(
                "INSERT INTO work_order_operations (work_order_id, operation_name, step_order, status) VALUES ($1, $2, $3, 'Bekliyor')",
                [woId, op.name, op.step]
              );
            }
            
            for (const deduction of deductions) {
              if (deduction.newStock < deduction.minStock && deduction.type === 'hammadde') {
                const existingPo = await client.query(
                  "SELECT id FROM purchase_orders WHERE item_id = $1 AND status = 'Bekliyor'",
                  [deduction.id]
                );
                if (existingPo.rows.length === 0) {
                  await client.query(
                    "INSERT INTO purchase_orders (item_id, quantity, status) VALUES ($1, $2, 'Bekliyor')",
                    [deduction.id, deduction.autoOrderQty || 50]
                  );
                }
              }
            }
            replenishmentType = 'make';
          }
        }
      }
    }

    if (shouldManageTransaction) await client.query("COMMIT");

    return {
      success: true,
      newStock: stock,
      replenishmentType,
    };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

export async function createItem(
  name: string,
  type: string,
  stock: number,
  minStock: number,
  autoOrderQuantity: number,
  externalClient?: PoolClient
) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (!name || !type) {
      throw new AppError("name ve type gereklidir.", 400);
    }

    if (stock < 0 || minStock < 0 || autoOrderQuantity < 0) {
      throw new AppError("Stok veya minStok 0'dan küçük olamaz.", 400);
    }

    if (type !== "hammadde" && type !== "son_urun") {
      throw new AppError("Geçersiz ürün tipi (sadece hammadde veya son_urun).", 400);
    }

    if (shouldManageTransaction) await client.query("BEGIN");

    const result = await client.query(
      "INSERT INTO items (name, type, stock, min_stock, auto_order_quantity) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [name, type, stock || 0, minStock || 0, autoOrderQuantity || 50]
    );

    const newItemId = result.rows[0].id;

    await client.query(
      "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, 'Giri\u015F', 'Sisteme \u0130lk Giri\u015F', $3)",
      [newItemId, stock || 0, stock || 0]
    );

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, message: "Ürün başarıyla eklendi." };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

export async function updateItemStock(
  id: string,
  newStock: number,
  externalClient?: PoolClient
) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (!id || newStock === undefined) {
      throw new AppError("id ve newStock gereklidir.", 400);
    }

    if (newStock < 0) {
      throw new AppError("Stok miktarı 0'dan küçük olamaz.", 400);
    }

    if (shouldManageTransaction) await client.query("BEGIN");

    const oldStockRes = await client.query("SELECT stock FROM items WHERE id = $1", [id]);
    
    if (oldStockRes.rows.length === 0) {
      throw new AppError("Ürün bulunamadı.", 404);
    }

    const currentStock = oldStockRes.rows[0].stock;
    const diff = newStock - currentStock;

    await client.query("UPDATE items SET stock = $1 WHERE id = $2", [
      newStock,
      id,
    ]);

    await client.query(
      "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, 'D\u00FCzeltme', 'Manuel D\u00FCzeltme', $3)",
      [id, diff, newStock]
    );

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, message: "Stok güncellendi." };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}
