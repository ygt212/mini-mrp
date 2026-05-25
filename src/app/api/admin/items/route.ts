import pool from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { name, type, stock, minStock } = await request.json();

    if (!name || !type) {
      return Response.json(
        { success: false, error: "name ve type gereklidir." },
        { status: 400 },
      );
    }

    if (stock < 0 || minStock < 0) {
      return Response.json(
        { success: false, error: "Stok veya minStok 0'dan küçük olamaz." },
        { status: 400 },
      );
    }

    if (type !== "hammadde" && type !== "son_urun") {
      return Response.json(
        {
          success: false,
          error: "Geçersiz ürün tipi (sadece hammadde veya son_urun).",
        },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    const result = await client.query(
      "INSERT INTO items (name, type, stock, min_stock) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, type, stock || 0, minStock || 0],
    );

    const newItemId = result.rows[0].id;

    await client.query(
      "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, 'Giri\u015F', 'Sisteme \u0130lk Giri\u015F', $3)",
      [newItemId, stock || 0, stock || 0]
    );

    await client.query("COMMIT");

    return Response.json({ success: true, message: "Ürün başarıyla eklendi." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ürün ekleme hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function PATCH(request: Request) {
  const client = await pool.connect();
  try {
    const { id, newStock } = await request.json();

    if (!id || newStock === undefined) {
      return Response.json(
        { success: false, error: "id ve newStock gereklidir." },
        { status: 400 },
      );
    }

    if (newStock < 0) {
      return Response.json(
        { success: false, error: "Stok miktarı 0'dan küçük olamaz." },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    const oldStockRes = await client.query("SELECT stock FROM items WHERE id = $1", [id]);
    
    if (oldStockRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "Ürün bulunamadı." },
        { status: 404 },
      );
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

    await client.query("COMMIT");

    return Response.json({ success: true, message: "Stok güncellendi." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Stok güncelleme hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
