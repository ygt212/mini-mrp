import { AppError } from "@/lib/errors";
import { processQualityControl } from "@/lib/services/qualityService";

export async function POST(request: Request) {
  try {
    const { qualityControlId, status, notes } = await request.json();

    if (!qualityControlId || !status) {
      return Response.json(
        { success: false, error: "qualityControlId ve status gereklidir." },
        { status: 400 },
      );
    }

    const result = await processQualityControl(qualityControlId, status, notes);
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
