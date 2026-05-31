import { AppError } from "@/lib/errors";
import { completeWorkOrder } from "@/lib/services/workOrderService";

export async function POST(request: Request) {
  try {
    const { workOrderId } = await request.json();

    if (!workOrderId) {
      return Response.json(
        { success: false, error: "workOrderId gereklidir." },
        { status: 400 },
      );
    }

    const result = await completeWorkOrder(workOrderId);
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
