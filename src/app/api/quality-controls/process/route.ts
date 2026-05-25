import pool from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const { qualityControlId, status, notes } = await request.json();

    if (!qualityControlId || !status) {
      return Response.json(
        { success: false, error: "qualityControlId ve status gereklidir." },
        { status: 400 }
      );
    }

    if (status !== "Onaylandı" && status !== "Reddedildi") {
      return Response.json(
        { success: false, error: "status yalnızca 'Onaylandı' veya 'Reddedildi' olabilir." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // Kalite kontrol kaydını güncelle (sadece 'Karantinada' olanlar işlenebilir)
    const updateResult = await client.query(
      "UPDATE quality_controls SET status = $1, notes = $2 WHERE id = $3 AND status = 'Karantinada'",
      [status, notes || null, qualityControlId]
    );

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "Bu kalite kaydı bulunamadı veya zaten daha önce işlenmiş." },
        { status: 400 }
      );
    }

    // Onaylandıysa üretilen miktarı stoka ekle
    if (status === "Onaylandı") {
      const woResult = await client.query(
        `SELECT wo.item_id, wo.target_quantity
         FROM quality_controls qc
         JOIN work_orders wo ON wo.id = qc.work_order_id
         WHERE qc.id = $1`,
        [qualityControlId]
      );

      if (woResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return Response.json(
          { success: false, error: "İlişkili iş emri bulunamadı." },
          { status: 404 }
        );
      }

      const { item_id, target_quantity } = woResult.rows[0];

      await client.query(
        "UPDATE items SET stock = stock + $1 WHERE id = $2",
        [target_quantity, item_id]
      );
    }

    await client.query("COMMIT");

    return Response.json({
      success: true,
      message:
        status === "Onaylandı"
          ? "Kalite süreci işlendi ve stoklar güncellendi."
          : "Kalite süreci işlendi, ürün reddedildi.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Kalite kontrol işleme hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
