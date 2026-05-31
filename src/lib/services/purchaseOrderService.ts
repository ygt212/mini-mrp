import pool from "@/lib/db";
import { PoolClient } from "pg";
import { AppError } from "@/lib/errors";
import { checkAndReleaseWaitingWorkOrders } from "./workOrderService";
export async function receivePurchaseOrder(
  poId: string,
  receiveAmount: number,
  externalClient?: PoolClient
) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (shouldManageTransaction) await client.query("BEGIN");

    const checkRes = await client.query(
      "SELECT item_id, quantity, received_quantity, status FROM purchase_orders WHERE id = $1",
      [poId]
    );

    if (checkRes.rows.length === 0) {
      throw new AppError("Sipariş bulunamadı.", 404);
    }

    const { item_id, quantity, received_quantity, status } = checkRes.rows[0];

    if (status !== "Sipari\u015F Ge\u00E7ildi" && status !== "K\u0131smi Teslim") {
      throw new AppError("Mal kabul yapabilmek için siparişin tedarikçiye geçilmiş olması gerekir.", 400);
    }

    if (status === "Tam Teslim") {
      throw new AppError("Sipariş zaten tamamen teslim alınmış.", 400);
    }

    const newReceived = received_quantity + receiveAmount;
    if (newReceived > quantity) {
      throw new AppError(`Mal kabul miktarı toplam siparişi (${quantity}) aşamaz.`, 400);
    }

    const newStatus = newReceived === quantity ? "Tam Teslim" : "K\u0131smi Teslim";

    await client.query(
      "UPDATE purchase_orders SET received_quantity = $1, status = $2 WHERE id = $3",
      [newReceived, newStatus, poId]
    );

    const stockUpdateRes = await client.query(
      "UPDATE items SET stock = stock + $1 WHERE id = $2 RETURNING stock",
      [receiveAmount, item_id]
    );

    const currentStock = stockUpdateRes.rows[0].stock;

    await client.query(
      "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, 'Giri\u015F', $3, $4)",
      [item_id, receiveAmount, `Mal Kabul (PO: ${poId})`, currentStock]
    );

    await checkAndReleaseWaitingWorkOrders(client);

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, message: "Mal kabul işlemi başarılı." };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

export async function updatePurchaseOrderStatus(
  poId: string,
  action: string,
  externalClient?: PoolClient
) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (shouldManageTransaction) await client.query("BEGIN");

    const checkRes = await client.query(
      "SELECT status FROM purchase_orders WHERE id = $1",
      [poId]
    );

    if (checkRes.rows.length === 0) {
      throw new AppError("Sipariş bulunamadı.", 404);
    }

    const currentStatus = checkRes.rows[0].status;
    let newStatus = "";

    if (action === "onayla") {
      if (currentStatus !== "Bekliyor") {
        throw new AppError("Sadece Bekliyor statüsündeki siparişler onaylanabilir.", 400);
      }
      newStatus = "Onayland\u0131";
    } else if (action === "siparis_gec") {
      if (currentStatus !== "Onayland\u0131") {
        throw new AppError("Sadece Onaylandı statüsündeki siparişler tedarikçiye geçilebilir.", 400);
      }
      newStatus = "Sipari\u015F Ge\u00E7ildi";
    } else {
      throw new AppError("Geçersiz aksiyon.", 400);
    }

    await client.query("UPDATE purchase_orders SET status = $1 WHERE id = $2", [newStatus, poId]);

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, message: "Sipariş durumu güncellendi." };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

export async function createPurchaseOrder(
  itemId: string,
  quantity: number,
  salesOrderId?: string | null,
  externalClient?: PoolClient
) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (shouldManageTransaction) await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO purchase_orders (item_id, quantity, status, sales_order_id)
       VALUES ($1, $2, 'Bekliyor', $3) RETURNING *`,
      [itemId, quantity, salesOrderId || null]
    );

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, purchaseOrder: result.rows[0] };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}
