import pool from "@/lib/db";

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const { workOrderId } = await request.json();

    if (!workOrderId) {
      return Response.json(
        { success: false, error: "workOrderId gereklidir." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // İş emrini tamamlandı olarak güncelle (zaten tamamlanmışsa etkilemez)
    const updateResult = await client.query(
      "UPDATE work_orders SET status = 'Tamamlandı' WHERE id = $1 AND status != 'Tamamlandı'",
      [workOrderId]
    );

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return Response.json(
        { success: false, error: "İş emri bulunamadı veya zaten tamamlanmış." },
        { status: 400 }
      );
    }

    // Otomatik kalite karantinası kaydı oluştur
    await client.query(
      "INSERT INTO quality_controls (work_order_id, status, notes) VALUES ($1, 'Karantinada', 'Üretim tamamlandı, kontrol bekleniyor.')",
      [workOrderId]
    );

    await client.query("COMMIT");

    return Response.json({
      success: true,
      message: "İş emri tamamlandı ve kalite karantinasına alındı.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("İş emri tamamlama hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
