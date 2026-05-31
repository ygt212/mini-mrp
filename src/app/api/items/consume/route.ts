import { AppError } from "@/lib/errors";
import { consumeItem } from "@/lib/services/inventoryService";

export async function POST(request: Request) {
  try {
    const { itemId, amount } = await request.json();

    if (!itemId || !amount || amount <= 0) {
      return Response.json(
        { success: false, error: "itemId ve geçerli bir amount gereklidir." },
        { status: 400 },
      );
    }

    const result = await consumeItem(itemId, amount);
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
