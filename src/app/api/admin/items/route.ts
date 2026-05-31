import { AppError } from "@/lib/errors";
import { createItem, updateItemStock } from "@/lib/services/inventoryService";

export async function POST(request: Request) {
  try {
    const { name, type, stock, minStock, autoOrderQuantity } = await request.json();

    if (!name || !type) {
      return Response.json(
        { success: false, error: "name ve type gereklidir." },
        { status: 400 },
      );
    }

    const result = await createItem(name, type, stock, minStock, autoOrderQuantity);
    return Response.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json({ success: false, error: error.message, ...(error.data as Record<string, unknown>) }, { status: error.statusCode });
    } else {
      console.error(error);
      return Response.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
    }
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

    const result = await updateItemStock(id, newStock);
    return Response.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json({ success: false, error: error.message, ...(error.data as Record<string, unknown>) }, { status: error.statusCode });
    } else {
      console.error(error);
      return Response.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
    }
  }

}
