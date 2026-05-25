import pool from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const { itemId, amount } = await request.json();

    if (!itemId || !amount || amount <= 0) {
      return Response.json(
        { success: false, error: "itemId ve geçerli bir amount gereklidir." },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    // Önce mevcut stoku kontrol et
    const checkResult = await client.query(
      "SELECT stock, min_stock FROM items WHERE id = $1",
      [itemId],
    );

    if (checkResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "Ürün bulunamadı." },
        { status: 404 },
      );
    }

    const currentStock = checkResult.rows[0].stock;

    if (amount > currentStock) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "Yetersiz stok." },
        { status: 400 },
      );
    }

    // Stoku azalt
    await client.query("UPDATE items SET stock = stock - $1 WHERE id = $2", [
      amount,
      itemId,
    ]);

    await client.query(
      "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, '\u00C7\u0131k\u0131\u015F', 'Manuel T\u00FCketim', $3)",
      [itemId, -amount, currentStock - amount]
    );

    // Güncel stok ve min_stock değerlerini al
    const result = await client.query(
      "SELECT stock, min_stock, type, auto_order_quantity FROM items WHERE id = $1",
      [itemId],
    );

    const { stock, min_stock, type, auto_order_quantity } = result.rows[0];
    let replenishmentType = null;

    // Stok minimum seviyenin altına düştüyse ve halihazırda sipariş/iş emri yoksa
    if (stock < min_stock) {
      if (type === 'hammadde') {
        const existingOrder = await client.query(
          "SELECT id FROM purchase_orders WHERE item_id = $1 AND status = 'Bekliyor' LIMIT 1",
          [itemId],
        );

        if (existingOrder.rows.length === 0) {
          await client.query(
            "INSERT INTO purchase_orders (item_id, quantity, status) VALUES ($1, $2, 'Bekliyor')",
            [itemId, auto_order_quantity || 50],
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
              [itemId],
            );

            if (bomCheck.rows.length === 0) {
              await client.query("ROLLBACK");
              return Response.json(
                { success: false, error: "Bu ürün için reçete (BOM) tanımlanmamış." },
                { status: 400 },
              );
            }

            const missingMaterials = [];
            const deductions = [];

            for (const bom of bomCheck.rows) {
              const requiredQty = bom.quantity * targetQuantity;
              const stockCheck = await client.query(
                "SELECT id, name, stock, min_stock, type, auto_order_quantity FROM items WHERE id = $1",
                [bom.raw_material_id],
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
              await client.query("ROLLBACK");
              return Response.json(
                { success: false, error: "Yetersiz hammadde stoku", missingMaterials },
                { status: 400 },
              );
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
            
            // Hammadde minimumun altına düştüyse otomatik satın alma oluştur
            for (const deduction of deductions) {
              if (deduction.newStock < deduction.minStock && deduction.type === 'hammadde') {
                const existingPo = await client.query(
                  "SELECT id FROM purchase_orders WHERE item_id = $1 AND status = 'Bekliyor'",
                  [deduction.id],
                );
                if (existingPo.rows.length === 0) {
                  await client.query(
                    "INSERT INTO purchase_orders (item_id, quantity, status) VALUES ($1, $2, 'Bekliyor')",
                    [deduction.id, deduction.autoOrderQty || 50],
                  );
                }
              }
            }
            replenishmentType = 'make';
          }
        }
      }
    }

    await client.query("COMMIT");

    return Response.json({
      success: true,
      newStock: stock,
      replenishmentType,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Stok tüketim hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
