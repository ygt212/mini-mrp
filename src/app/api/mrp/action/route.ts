import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { createWorkOrder } from "@/lib/services/workOrderService";
import { createPurchaseOrder } from "@/lib/services/purchaseOrderService";

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const { actionType, itemId, quantity, salesOrderId, sourceSalesOrderIds } = body;

    if (!actionType || !itemId || !quantity) {
      return NextResponse.json({ error: "Eksik parametreler." }, { status: 400 });
    }

    await client.query("BEGIN");

    if (actionType === 'MAKE') {
      // Servis katmanını çağır (iş emri oluştur, stok düş, vb.)
      const woResult = await createWorkOrder(itemId, quantity, salesOrderId, client, true);
      
      if (salesOrderId) {
         // Sales order statüsünü güncelle
         const soCheck = await client.query("SELECT status FROM sales_orders WHERE id = $1", [salesOrderId]);
         if (soCheck.rows.length > 0 && soCheck.rows[0].status !== 'Malzeme Bekliyor') {
           await client.query("UPDATE sales_orders SET status = 'Üretim Planlandı' WHERE id = $1", [salesOrderId]);
         }
      }
      
      await client.query("COMMIT");
      return NextResponse.json({ success: true, message: "İş emri oluşturuldu ve stoklar güncellendi.", id: woResult.id });
      
    } else if (actionType === 'BUY') {
      // Aggregate BUY: salesOrderId may be absent, use sourceSalesOrderIds for traceability
      const poResult = await createPurchaseOrder(itemId, quantity, salesOrderId || null, client);
      
      // Update linked sales orders to 'Malzeme Bekliyor'
      const soIdsToUpdate: string[] = salesOrderId
        ? [salesOrderId]
        : (Array.isArray(sourceSalesOrderIds) ? sourceSalesOrderIds : []);
      
      for (const soId of soIdsToUpdate) {
        await client.query(
          "UPDATE sales_orders SET status = 'Malzeme Bekliyor' WHERE id = $1 AND status = 'Bekliyor'",
          [soId]
        );
      }
      
      await client.query("COMMIT");
      return NextResponse.json(poResult);
      
    } else {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Geçersiz actionType." }, { status: 400 });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("MRP Action Error:", error);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  } finally {
    client.release();
  }
}
