import { AppError } from "@/lib/errors";
import { createCustomer } from "@/lib/services/sales.service";

export async function POST(request: Request) {
  try {
    const { name, contactInfo } = await request.json();

    const result = await createCustomer(name, contactInfo);
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
