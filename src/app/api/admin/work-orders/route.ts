import pool from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { itemId, targetQuantity } = await request.json();

    if (!itemId || !targetQuantity) {
      return Response.json(
        { success: false, error: "itemId ve targetQuantity gereklidir." },
        { status: 400 },
      );
    }

    if (targetQuantity <= 0) {
      return Response.json(
        { success: false, error: "Hedef miktar 0 veya daha küçük olamaz." },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    const itemCheck = await client.query("SELECT id FROM items WHERE id = $1", [
      itemId,
    ]);
    if (itemCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "Geçersiz ürün ID." },
        { status: 400 },
      );
    }

    // BOM (Reçete) kontrolü ve stok hesaplamaları
    const bomCheck = await client.query(
      "SELECT raw_material_id, quantity FROM bill_of_materials WHERE product_id = $1",
      [itemId],
    );

    if (bomCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return Response.json(
        {
          success: false,
          error: "Bu ürün için reçete (BOM) tanımlanmamış, iş emri açılamaz.",
        },
        { status: 400 },
      );
    }

    const missingMaterials = [];
    const deductions = [];

    for (const bom of bomCheck.rows) {
      const requiredQty = bom.quantity * targetQuantity;
      const stockCheck = await client.query(
        "SELECT id, name, stock, min_stock FROM items WHERE id = $1",
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
          });
        }
      }
    }

    // Eksik hammadde varsa işlemi iptal et
    if (missingMaterials.length > 0) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "Yetersiz hammadde stoku", missingMaterials },
        { status: 400 },
      );
    }

    const woResult = await client.query(
      "INSERT INTO work_orders (item_id, target_quantity, status) VALUES ($1, $2, 'Planland\u0131') RETURNING id",
      [itemId, targetQuantity],
    );
    const newWoId = woResult.rows[0].id;

    // Hammadde stoklarını düş ve gerekiyorsa satın alma siparişi oluştur
    for (const deduction of deductions) {
      await client.query("UPDATE items SET stock = $1 WHERE id = $2", [
        deduction.newStock,
        deduction.id,
      ]);

      await client.query(
        "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, '\u00C7\u0131k\u0131\u015F', $3, $4)",
        [deduction.id, -deduction.deducted, `\u0130\u015F Emri \u00DCretim T\u00FCketimi (${newWoId})`, deduction.newStock]
      );

      // Stok minimumun altına düştüyse
      if (deduction.newStock < deduction.minStock) {
        const orderQty = Math.max(
          deduction.minStock - deduction.newStock + 50,
          100,
        );

        const existingPo = await client.query(
          "SELECT id FROM purchase_orders WHERE item_id = $1 AND status = 'Bekliyor'",
          [deduction.id],
        );

        if (existingPo.rows.length === 0) {
          await client.query(
            "INSERT INTO purchase_orders (item_id, quantity, status) VALUES ($1, $2, 'Bekliyor')",
            [deduction.id, orderQty],
          );
        }
      }
    }

    // Rota adımlarını (Operasyonları) oluştur
    const operations = [
      { step: 1, name: "Kesim/Haz\u0131rl\u0131k" },
      { step: 2, name: "Montaj" },
      { step: 3, name: "Paketleme" },
    ];

    for (const op of operations) {
      await client.query(
        "INSERT INTO work_order_operations (work_order_id, operation_name, step_order, status) VALUES ($1, $2, $3, 'Bekliyor')",
        [newWoId, op.name, op.step],
      );
    }

    await client.query("COMMIT");

    return Response.json({ success: true, message: "İş emri oluşturuldu." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("İş emri oluşturma hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
