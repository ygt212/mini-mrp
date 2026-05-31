import pool from "@/lib/db";
import { AppError } from "@/lib/errors";
import { PoolClient } from "pg";

export async function createCustomer(
  name: string,
  contactInfo: string,
  externalClient?: PoolClient
) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (!name) {
      throw new AppError("Müşteri adı gereklidir.", 400);
    }

    if (shouldManageTransaction) await client.query("BEGIN");

    const result = await client.query(
      "INSERT INTO customers (name, contact_info) VALUES ($1, $2) RETURNING *",
      [name, contactInfo || null]
    );

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, customer: result.rows[0] };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

export async function createSalesOrder(
  customerId: string,
  itemId: string,
  quantity: number,
  targetDeliveryDate: string,
  externalClient?: PoolClient
) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (!customerId || !itemId || !quantity || quantity <= 0) {
      throw new AppError("Geçerli müşteri, ürün ve miktar gereklidir.", 400);
    }

    if (shouldManageTransaction) await client.query("BEGIN");

    const customerCheck = await client.query("SELECT id FROM customers WHERE id = $1", [customerId]);
    if (customerCheck.rowCount === 0) {
      throw new AppError('Müşteri bulunamadı veya geçersiz Müşteri ID.', 404);
    }

    const itemCheck = await client.query("SELECT type, stock, reserved_quantity FROM items WHERE id = $1", [itemId]);
    if (itemCheck.rowCount === 0) {
      throw new AppError("Ürün bulunamadı.", 404);
    }

    if (itemCheck.rows[0].type !== 'son_urun') {
      throw new AppError("Sadece son ürünler için satış siparişi açılabilir.", 400);
    }

    const item = itemCheck.rows[0];
    const stock = item.stock || 0;
    const reserved = item.reserved_quantity || 0;
    const availableStock = stock - reserved;

    let status = 'Bekliyor';
    let reservationAmount = 0;

    if (availableStock >= quantity) {
      status = 'Hazır';
      reservationAmount = quantity;
    } else {
      status = 'Bekliyor';
      reservationAmount = availableStock > 0 ? availableStock : 0;
    }

    if (reservationAmount > 0) {
      await client.query(
        "UPDATE items SET reserved_quantity = COALESCE(reserved_quantity, 0) + $1 WHERE id = $2",
        [reservationAmount, itemId]
      );
    }

    const result = await client.query(
      `INSERT INTO sales_orders (customer_id, item_id, quantity, target_delivery_date, status, reserved_quantity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [customerId, itemId, quantity, targetDeliveryDate || null, status, reservationAmount]
    );

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, order: result.rows[0] };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}

export async function getSalesOrders() {
  const result = await pool.query(
    `SELECT so.*, c.name as customer_name, i.name as item_name 
     FROM sales_orders so
     JOIN customers c ON so.customer_id = c.id
     JOIN items i ON so.item_id = i.id
     ORDER BY so.created_at DESC`
  );
  return result.rows;
}

export async function getCustomers() {
  const result = await pool.query(
    `SELECT * FROM customers ORDER BY name ASC`
  );
  return result.rows;
}

export async function deliverSalesOrder(salesOrderId: string, externalClient?: PoolClient) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (shouldManageTransaction) await client.query("BEGIN");

    const soCheck = await client.query(
      "SELECT id, item_id, quantity, reserved_quantity, status FROM sales_orders WHERE id = $1",
      [salesOrderId]
    );

    if (soCheck.rowCount === 0) {
      throw new AppError("Satış siparişi bulunamadı.", 404);
    }

    const so = soCheck.rows[0];

    if (so.status !== 'Hazır') {
      throw new AppError("Sadece 'Hazır' statüsündeki siparişler teslim edilebilir.", 400);
    }

    if (so.reserved_quantity < so.quantity) {
      throw new AppError("Siparişin rezerve stok miktarı teslimat için yetersiz.", 400);
    }

    const itemCheck = await client.query(
      "SELECT stock, reserved_quantity FROM items WHERE id = $1",
      [so.item_id]
    );

    if (itemCheck.rowCount === 0) {
      throw new AppError("Siparişe ait ürün bulunamadı.", 404);
    }

    const item = itemCheck.rows[0];

    if (item.stock < so.quantity || item.reserved_quantity < so.quantity) {
      throw new AppError("Teslimat için yeterli stok veya rezerve miktar bulunmuyor.", 400);
    }

    await client.query(
      "UPDATE items SET stock = stock - $1, reserved_quantity = reserved_quantity - $1 WHERE id = $2",
      [so.quantity, so.item_id]
    );

    await client.query(
      `INSERT INTO inventory_transactions 
       (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) 
       VALUES ($1, $2, 'Çıkış', $3, (SELECT stock FROM items WHERE id = $1))`,
      [so.item_id, -so.quantity, `Satış Siparişi Teslimatı (${salesOrderId})`]
    );

    await client.query(
      "UPDATE sales_orders SET status = 'Teslim Edildi', reserved_quantity = GREATEST(reserved_quantity - $1, 0) WHERE id = $2",
      [so.quantity, salesOrderId]
    );

    if (shouldManageTransaction) await client.query("COMMIT");

    return { success: true, message: "Sipariş teslim edildi ve stoktan düşüldü." };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}
