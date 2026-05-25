import pool from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { poId, action } = await request.json();

    if (!poId || !action) {
      return Response.json(
        { success: false, error: "poId ve action gereklidir." },
        { status: 400 },
      );
    }

    const checkRes = await pool.query(
      "SELECT status FROM purchase_orders WHERE id = $1",
      [poId]
    );

    if (checkRes.rows.length === 0) {
      return Response.json({ success: false, error: "Sipariş bulunamadı." }, { status: 404 });
    }

    const currentStatus = checkRes.rows[0].status;

    let newStatus = "";
    if (action === "onayla") {
      if (currentStatus !== "Bekliyor") {
        return Response.json({ success: false, error: "Sadece Bekliyor statüsündeki siparişler onaylanabilir." }, { status: 400 });
      }
      newStatus = "Onayland\u0131";
    } else if (action === "siparis_gec") {
      if (currentStatus !== "Onayland\u0131") {
        return Response.json({ success: false, error: "Sadece Onaylandı statüsündeki siparişler tedarikçiye geçilebilir." }, { status: 400 });
      }
      newStatus = "Sipari\u015F Ge\u00E7ildi";
    } else {
      return Response.json({ success: false, error: "Geçersiz aksiyon." }, { status: 400 });
    }

    await pool.query("UPDATE purchase_orders SET status = $1 WHERE id = $2", [newStatus, poId]);

    return Response.json({ success: true, message: "Sipariş durumu güncellendi." });
  } catch (error) {
    console.error("Satın Alma sipariş durum güncelleme hatası:", error);
    return Response.json({ success: false, error: "Sunucu hatası." }, { status: 500 });
  }
}
