import pool from "@/lib/db";
import { AppError } from "@/lib/errors";
import { PoolClient } from "pg";

export interface MRPRecommendation {
  type: 'MAKE' | 'BUY';
  itemId: string;
  itemName?: string;
  quantity: number;
  salesOrderId?: string;
  reason?: 'sales_order_shortage' | 'waiting_work_order_material' | 'stock_shortage';
  sourceSalesOrderIds?: string[];
  sourceWorkOrderIds?: string[];
}

// ─── Helpers ────────────────────────────────────────────────

async function getBomRequirements(productId: string, client: PoolClient) {
  const result = await client.query(`
    SELECT b.raw_material_id, b.quantity as required_per_unit, 
           i.name as rm_name, i.stock, i.reserved_quantity
    FROM bill_of_materials b
    JOIN items i ON b.raw_material_id = i.id
    WHERE b.product_id = $1
  `, [productId]);
  return result.rows;
}

async function getOpenWorkOrders(salesOrderId: string, client: PoolClient) {
  const result = await client.query(`
    SELECT id, target_quantity, status
    FROM work_orders
    WHERE sales_order_id = $1 AND status != 'Tamamlandı'
  `, [salesOrderId]);
  return result.rows;
}

async function getOpenPurchaseQuantity(itemId: string, client: PoolClient): Promise<number> {
  const result = await client.query(`
    SELECT COALESCE(SUM(quantity - received_quantity), 0) as open_po_quantity
    FROM purchase_orders
    WHERE item_id = $1 AND status != 'Tam Teslim'
  `, [itemId]);
  return parseInt(result.rows[0].open_po_quantity, 10);
}

async function getWaitingWorkOrders(client: PoolClient) {
  const result = await client.query(`
    SELECT wo.id, wo.item_id, wo.target_quantity, wo.sales_order_id
    FROM work_orders wo
    WHERE wo.status = 'Malzeme Bekliyor'
  `);
  return result.rows;
}

// ─── Accumulator for raw material needs ─────────────────────

interface RawMaterialAccumulator {
  totalNeeded: number;
  itemName: string;
  stock: number;
  reservedQuantity: number;
  sourceSalesOrderIds: Set<string>;
  sourceWorkOrderIds: Set<string>;
}

// ─── Main MRP Engine ────────────────────────────────────────

export async function runMRP(): Promise<MRPRecommendation[]> {
  const client = await pool.connect();
  const recommendations: MRPRecommendation[] = [];

  // Accumulate raw material needs across all sources (item_id → needs)
  const rawMaterialNeeds = new Map<string, RawMaterialAccumulator>();

  try {
    // ── Phase 1: Finished Good Demand (MAKE recommendations) ──

    const salesOrdersResult = await client.query(`
      SELECT so.id, so.item_id, so.quantity, so.reserved_quantity, i.name as item_name
      FROM sales_orders so
      JOIN items i ON so.item_id = i.id
      WHERE so.status IN ('Bekliyor', 'Malzeme Bekliyor', 'Üretim Planlandı')
    `);

    for (const order of salesOrdersResult.rows) {
      const openWOs = await getOpenWorkOrders(order.id, client);
      const totalWOQuantity = openWOs.reduce((sum: number, wo: { target_quantity: number }) => sum + Number(wo.target_quantity), 0);

      const finishedGoodNeed = order.quantity - (order.reserved_quantity || 0) - totalWOQuantity;

      if (finishedGoodNeed > 0) {
        recommendations.push({
          type: 'MAKE',
          itemId: order.item_id,
          itemName: order.item_name,
          quantity: finishedGoodNeed,
          salesOrderId: order.id,
          reason: 'sales_order_shortage',
        });

        // Accumulate BOM needs from new MAKE proposal
        const bomRows = await getBomRequirements(order.item_id, client);
        for (const bom of bomRows) {
          const needed = bom.required_per_unit * finishedGoodNeed;
          const acc = rawMaterialNeeds.get(bom.raw_material_id);
          if (acc) {
            acc.totalNeeded += needed;
            acc.sourceSalesOrderIds.add(order.id);
          } else {
            rawMaterialNeeds.set(bom.raw_material_id, {
              totalNeeded: needed,
              itemName: bom.rm_name,
              stock: bom.stock,
              reservedQuantity: bom.reserved_quantity,
              sourceSalesOrderIds: new Set([order.id]),
              sourceWorkOrderIds: new Set(),
            });
          }
        }
      }
    }

    // ── Phase 2: Waiting Work Order Material Demand ──

    const waitingWOs = await getWaitingWorkOrders(client);

    for (const wo of waitingWOs) {
      const bomRows = await getBomRequirements(wo.item_id, client);
      for (const bom of bomRows) {
        const needed = bom.required_per_unit * Number(wo.target_quantity);
        const acc = rawMaterialNeeds.get(bom.raw_material_id);
        if (acc) {
          acc.totalNeeded += needed;
          acc.sourceWorkOrderIds.add(wo.id);
          if (wo.sales_order_id) acc.sourceSalesOrderIds.add(wo.sales_order_id);
        } else {
          const soIds = new Set<string>();
          if (wo.sales_order_id) soIds.add(wo.sales_order_id);
          rawMaterialNeeds.set(bom.raw_material_id, {
            totalNeeded: needed,
            itemName: bom.rm_name,
            stock: bom.stock,
            reservedQuantity: bom.reserved_quantity,
            sourceSalesOrderIds: soIds,
            sourceWorkOrderIds: new Set([wo.id]),
          });
        }
      }
    }

    // ── Phase 3: Net raw material need → BUY recommendations ──

    for (const [itemId, acc] of rawMaterialNeeds) {
      // Re-fetch stock to get latest values (may have changed across iterations)
      const stockResult = await client.query(
        "SELECT stock, reserved_quantity FROM items WHERE id = $1",
        [itemId]
      );
      const currentStock = stockResult.rows[0]?.stock || 0;
      const currentReserved = stockResult.rows[0]?.reserved_quantity || 0;
      const availableStock = currentStock - currentReserved;

      const openPO = await getOpenPurchaseQuantity(itemId, client);

      let buyQuantity = acc.totalNeeded;
      if (availableStock > 0) buyQuantity -= availableStock;
      if (openPO > 0) buyQuantity -= openPO;

      if (buyQuantity > 0) {
        recommendations.push({
          type: 'BUY',
          itemId,
          itemName: acc.itemName,
          quantity: buyQuantity,
          reason: acc.sourceWorkOrderIds.size > 0
            ? 'waiting_work_order_material'
            : 'sales_order_shortage',
          sourceSalesOrderIds: acc.sourceSalesOrderIds.size > 0
            ? Array.from(acc.sourceSalesOrderIds)
            : undefined,
          sourceWorkOrderIds: acc.sourceWorkOrderIds.size > 0
            ? Array.from(acc.sourceWorkOrderIds)
            : undefined,
        });
      }
    }

    return recommendations;
  } catch (error) {
    console.error("MRP Error:", error);
    throw new AppError("MRP motoru çalıştırılırken bir hata oluştu.", 500);
  } finally {
    client.release();
  }
}
