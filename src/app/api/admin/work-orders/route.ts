import { AppError } from "@/lib/errors";
import { createWorkOrder } from "@/lib/services/workOrderService";

export async function POST(request: Request) {
  try {
    const { itemId, targetQuantity } = await request.json();

    if (!itemId || !targetQuantity) {
      return Response.json(
        { success: false, error: "itemId ve targetQuantity gereklidir." },
        { status: 400 },
      );
    }

    const result = await createWorkOrder(itemId, targetQuantity);
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
