import pool from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const { itemId, amount } = await request.json();

    if (!itemId || !amount || amount <= 0) {
      return Response.json(
        { success: false, error: "itemId ve geçerli bir amount gereklidir." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // Önce mevcut stoku kontrol et
    const checkResult = await client.query(
      "SELECT stock, min_stock FROM items WHERE id = $1",
      [itemId]
    );

    if (checkResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "Ürün bulunamadı." },
        { status: 404 }
      );
    }

    const currentStock = checkResult.rows[0].stock;

    if (amount > currentStock) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "Yetersiz stok." },
        { status: 400 }
      );
    }

    // Stoku azalt
    await client.query(
      "UPDATE items SET stock = stock - $1 WHERE id = $2",
      [amount, itemId]
    );

    // Güncel stok ve min_stock değerlerini al
    const result = await client.query(
      "SELECT stock, min_stock FROM items WHERE id = $1",
      [itemId]
    );

    const { stock, min_stock } = result.rows[0];
    let autoOrdered = false;

    // Stok minimum seviyenin altına düştüyse ve halihazırda 'Bekliyor' siparişi yoksa
    if (stock < min_stock) {
      const existingOrder = await client.query(
        "SELECT id FROM purchase_orders WHERE item_id = $1 AND status = 'Bekliyor' LIMIT 1",
        [itemId]
      );

      if (existingOrder.rows.length === 0) {
        await client.query(
          "INSERT INTO purchase_orders (item_id, quantity, status) VALUES ($1, 50, 'Bekliyor')",
          [itemId]
        );
        autoOrdered = true;
      }
    }

    await client.query("COMMIT");

    return Response.json({
      success: true,
      newStock: stock,
      autoOrdered,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Stok tüketim hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
