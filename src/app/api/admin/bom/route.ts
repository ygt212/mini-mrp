import { AppError } from "@/lib/errors";
import pool from "@/lib/db";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const { productId, rawMaterialId, quantity } = await request.json();

    if (!productId || !rawMaterialId || !quantity) {
      return Response.json(
        {
          success: false,
          error: "productId, rawMaterialId ve quantity gereklidir.",
        },
        { status: 400 },
      );
    }

    if (!UUID_REGEX.test(productId) || !UUID_REGEX.test(rawMaterialId)) {
      return Response.json(
        { success: false, error: "Geçersiz UUID formatı." },
        { status: 400 },
      );
    }

    if (productId === rawMaterialId) {
      return Response.json(
        { success: false, error: "Ürün ve hammadde aynı olamaz." },
        { status: 400 },
      );
    }

    if (quantity <= 0) {
      return Response.json(
        { success: false, error: "Miktar 0'dan büyük olmalıdır." },
        { status: 400 },
      );
    }

    const typeCheck = await pool.query(
      "SELECT id, type FROM items WHERE id = $1 OR id = $2",
      [productId, rawMaterialId],
    );

    let productValid = false;
    let rawValid = false;

    for (const row of typeCheck.rows) {
      if (row.id === productId && row.type === "son_urun") productValid = true;
      if (row.id === rawMaterialId && row.type === "hammadde") rawValid = true;
    }

    if (!productValid || !rawValid) {
      return Response.json(
        {
          success: false,
          error:
            "Geçersiz ürün tipleri. productId 'son_urun', rawMaterialId 'hammadde' olmalıdır.",
        },
        { status: 400 },
      );
    }

    const duplicateCheck = await pool.query(
      "SELECT id FROM bill_of_materials WHERE product_id = $1 AND raw_material_id = $2",
      [productId, rawMaterialId],
    );

    if (duplicateCheck.rows.length > 0) {
      return Response.json(
        { success: false, error: "Bu reçete daha önce tanımlanmış." },
        { status: 400 },
      );
    }

    await pool.query(
      "INSERT INTO bill_of_materials (product_id, raw_material_id, quantity) VALUES ($1, $2, $3)",
      [productId, rawMaterialId, quantity],
    );

    return Response.json({ success: true, message: "Reçete eklendi" });
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json({ success: false, error: error.message, ...(error.data as Record<string, unknown>) }, { status: error.statusCode });
    } else {
      console.error(error);
      return Response.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
    }
  }

}
