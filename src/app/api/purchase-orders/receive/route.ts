import pool from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { poId, receiveAmount } = await request.json();

    if (!poId || receiveAmount === undefined || receiveAmount <= 0) {
      return Response.json(
        { success: false, error: "Geçerli poId ve sıfırdan büyük receiveAmount gereklidir." },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    const checkRes = await client.query(
      "SELECT item_id, quantity, received_quantity, status FROM purchase_orders WHERE id = $1",
      [poId]
    );

    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return Response.json({ success: false, error: "Sipariş bulunamadı." }, { status: 404 });
    }

    const { item_id, quantity, received_quantity, status } = checkRes.rows[0];

    if (status !== "Sipari\u015F Ge\u00E7ildi" && status !== "K\u0131smi Teslim") {
      await client.query("ROLLBACK");
      return Response.json({ success: false, error: "Mal kabul yapabilmek için siparişin tedarikçiye geçilmiş olması gerekir." }, { status: 400 });
    }

    if (status === "Tam Teslim") {
      await client.query("ROLLBACK");
      return Response.json({ success: false, error: "Sipariş zaten tamamen teslim alınmış." }, { status: 400 });
    }

    const newReceived = received_quantity + receiveAmount;
    if (newReceived > quantity) {
      await client.query("ROLLBACK");
      return Response.json({ success: false, error: `Mal kabul miktarı toplam siparişi (${quantity}) aşamaz.` }, { status: 400 });
    }

    const newStatus = newReceived === quantity ? "Tam Teslim" : "K\u0131smi Teslim";

    await client.query(
      "UPDATE purchase_orders SET received_quantity = $1, status = $2 WHERE id = $3",
      [newReceived, newStatus, poId]
    );

    const stockUpdateRes = await client.query(
      "UPDATE items SET stock = stock + $1 WHERE id = $2 RETURNING stock",
      [receiveAmount, item_id]
    );

    const currentStock = stockUpdateRes.rows[0].stock;

    await client.query(
      "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, 'Giri\u015F', $3, $4)",
      [item_id, receiveAmount, `Mal Kabul (PO: ${poId})`, currentStock]
    );

    await client.query("COMMIT");

    return Response.json({ success: true, message: "Mal kabul işlemi başarılı." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Mal kabul hatası:", error);
    return Response.json({ success: false, error: "Sunucu hatası." }, { status: 500 });
  } finally {
    client.release();
  }
}
