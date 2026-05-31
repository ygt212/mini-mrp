import { NextResponse } from "next/server";
import { deliverSalesOrder } from "@/lib/services/sales.service";

import { AppError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const { salesOrderId } = await req.json();

    if (!salesOrderId) {
      return NextResponse.json({ success: false, error: "Satış siparişi ID'si eksik." }, { status: 400 });
    }

    const result = await deliverSalesOrder(salesOrderId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Sales Order Delivery Error:", error);
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: "Bilinmeyen bir hata oluştu." }, { status: 500 });
  }
}
