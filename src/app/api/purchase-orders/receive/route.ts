import { AppError } from "@/lib/errors";
import { receivePurchaseOrder } from "@/lib/services/purchaseOrderService";

export async function POST(request: Request) {
  try {
    const { poId, receiveAmount } = await request.json();

    if (!poId || receiveAmount === undefined || receiveAmount <= 0) {
      return Response.json(
        { success: false, error: "Geçerli poId ve sıfırdan büyük receiveAmount gereklidir." },
        { status: 400 },
      );
    }

    const result = await receivePurchaseOrder(poId, receiveAmount);
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
