import { AppError } from "@/lib/errors";
import { updatePurchaseOrderStatus } from "@/lib/services/purchaseOrderService";

export async function POST(request: Request) {
  try {
    const { poId, action } = await request.json();

    if (!poId || !action) {
      return Response.json(
        { success: false, error: "poId ve action gereklidir." },
        { status: 400 },
      );
    }

    const result = await updatePurchaseOrderStatus(poId, action);
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
