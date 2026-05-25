import pool from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const { qualityControlId, status, notes } = await request.json();

    if (!qualityControlId || !status) {
      return Response.json(
        { success: false, error: "qualityControlId ve status gereklidir." },
        { status: 400 },
      );
    }

    const isApproved =
      status.includes("Onay") || status.toLowerCase() === "approved";
    const isRejected =
      status.includes("Red") || status.toLowerCase() === "rejected";

    if (!isApproved && !isRejected) {
      return Response.json(
        {
          success: false,
          error: "Geçersiz durum. İçinde 'Onay' veya 'Red' geçmelidir.",
        },
        { status: 400 },
      );
    }

    const finalStatus = isApproved ? "Onaylandı" : "Reddedildi";

    await client.query("BEGIN");

    // Kalite kontrol kaydını güncelle (sadece 'Karantinada' olanlar işlenebilir)
    const updateResult = await client.query(
      "UPDATE quality_controls SET status = $1, notes = $2 WHERE id = $3 AND status = 'Karantinada'",
      [finalStatus, notes || null, qualityControlId],
    );

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return Response.json(
        {
          success: false,
          error: "Bu kalite kaydı bulunamadı veya zaten daha önce işlenmiş.",
        },
        { status: 400 },
      );
    }

    // Onaylandıysa üretilen miktarı stoka ekle
    if (finalStatus === "Onaylandı") {
      const woResult = await client.query(
        `SELECT wo.item_id, wo.target_quantity
         FROM quality_controls qc
         JOIN work_orders wo ON wo.id = qc.work_order_id
         WHERE qc.id = $1`,
        [qualityControlId],
      );

      if (woResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return Response.json(
          { success: false, error: "İlişkili iş emri bulunamadı." },
          { status: 404 },
        );
      }

      const { item_id, target_quantity } = woResult.rows[0];

      const stockUpdateResult = await client.query("UPDATE items SET stock = stock + $1 WHERE id = $2 RETURNING stock", [
        target_quantity,
        item_id,
      ]);
      
      const currentStock = stockUpdateResult.rows[0].stock;

      await client.query(
        "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, 'Giri\u015F', 'Kalite Onay\u0131 \u00DCretim Giri\u015Fi', $3)",
        [item_id, target_quantity, currentStock]
      );
    }

    await client.query("COMMIT");

    return Response.json({
      success: true,
      message:
        finalStatus === "Onaylandı"
          ? "Kalite süreci işlendi ve stoklar güncellendi."
          : "Kalite süreci işlendi, ürün reddedildi.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Kalite kontrol işleme hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
