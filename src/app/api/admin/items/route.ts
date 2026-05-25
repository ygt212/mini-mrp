import pool from "@/lib/db";

export async function POST(request: Request) {
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

    await pool.query(
      "INSERT INTO items (name, type, stock, min_stock) VALUES ($1, $2, $3, $4)",
      [name, type, stock || 0, minStock || 0],
    );

    return Response.json({ success: true, message: "Ürün başarıyla eklendi." });
  } catch (error) {
    console.error("Ürün ekleme hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
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

    const res = await pool.query("UPDATE items SET stock = $1 WHERE id = $2", [
      newStock,
      id,
    ]);

    if (res.rowCount === 0) {
      return Response.json(
        { success: false, error: "Ürün bulunamadı." },
        { status: 404 },
      );
    }

    return Response.json({ success: true, message: "Stok güncellendi." });
  } catch (error) {
    console.error("Stok güncelleme hatası:", error);
    return Response.json(
      { success: false, error: "Sunucu hatası." },
      { status: 500 },
    );
  }
}
