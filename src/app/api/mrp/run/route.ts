import { NextResponse } from "next/server";
import { runMRP } from "@/lib/services/mrp.service";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const recommendations = await runMRP();
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("MRP Run API Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "MRP motoru çalıştırılırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
