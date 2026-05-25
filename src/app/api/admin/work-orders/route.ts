import pool from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { itemId, targetQuantity } = await request.json();

    if (!itemId || !targetQuantity) {
      return Response.json(
        { success: false, error: "itemId ve targetQuantity gereklidir." },
        { status: 400 }
      );
    }

    if (targetQuantity <= 0) {
      return Response.json(
        { success: false, error: "Hedef miktar 0 veya daha küçük olamaz." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const itemCheck = await client.query("SELECT id FROM items WHERE id = $1", [itemId]);
    if (itemCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "Geçersiz ürün ID." },
        { status: 400 }
      );
    }
    await client.query(
      "INSERT INTO work_orders (item_id, target_quantity, status) VALUES ($1, $2, 'Planlandı')",
      [itemId, targetQuantity]
    );
    await client.query("COMMIT");

    return Response.json({ success: true, message: "İş emri oluşturuldu." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("İş emri oluşturma hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
