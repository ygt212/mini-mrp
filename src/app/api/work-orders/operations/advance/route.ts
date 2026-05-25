import pool from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { workOrderId } = await request.json();

    if (!workOrderId) {
      return Response.json(
        { success: false, error: "İş emri ID gereklidir." },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `
      UPDATE work_order_operations
      SET status = 'Tamamland\u0131'
      WHERE id = (
        SELECT id FROM work_order_operations
        WHERE work_order_id = $1 AND status = 'Bekliyor'
        ORDER BY step_order ASC
        LIMIT 1
      )
      RETURNING *
    `,
      [workOrderId],
    );

    if (result.rows.length === 0) {
      return Response.json(
        { success: false, error: "Bekleyen operasyon adımı bulunamadı." },
        { status: 404 },
      );
    }

    await pool.query(
      "UPDATE work_orders SET status = '\u00DCretimde' WHERE id = $1 AND status = 'Planland\u0131'",
      [workOrderId],
    );

    return Response.json({
      success: true,
      message: "Operasyon adımı başarıyla tamamlandı.",
    });
  } catch (error) {
    console.error("Operasyon ilerletme hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 },
    );
  }
}
