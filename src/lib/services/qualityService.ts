import pool from "@/lib/db";
import { PoolClient } from "pg";
import { AppError } from "@/lib/errors";

export async function processQualityControl(
  qualityControlId: string,
  status: string,
  notes: string,
  externalClient?: PoolClient
) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    const isApproved = status.includes("Onay") || status.toLowerCase() === "approved";
    const isRejected = status.includes("Red") || status.toLowerCase() === "rejected";

    if (!isApproved && !isRejected) {
      throw new AppError("Geçersiz durum. İçinde 'Onay' veya 'Red' geçmelidir.", 400);
    }

    const finalStatus = isApproved ? "Onaylandı" : "Reddedildi";

    if (shouldManageTransaction) await client.query("BEGIN");

    const updateResult = await client.query(
      "UPDATE quality_controls SET status = $1, notes = $2 WHERE id = $3 AND status = 'Karantinada'",
      [finalStatus, notes || null, qualityControlId]
    );

    if (updateResult.rowCount === 0) {
      throw new AppError("Bu kalite kaydı bulunamadı veya zaten daha önce işlenmiş.", 404);
    }

    if (finalStatus === "Onaylandı") {
      const woResult = await client.query(
        `SELECT wo.item_id, wo.target_quantity, wo.sales_order_id
         FROM quality_controls qc
         JOIN work_orders wo ON wo.id = qc.work_order_id
         WHERE qc.id = $1`,
        [qualityControlId]
      );

      if (woResult.rows.length === 0) {
        throw new AppError("İlişkili iş emri bulunamadı.", 404);
      }

      const { item_id, target_quantity, sales_order_id } = woResult.rows[0];

      let currentStock;

      if (sales_order_id) {
        const stockUpdateResult = await client.query(
          "UPDATE items SET stock = stock + $1, reserved_quantity = reserved_quantity + $1 WHERE id = $2 RETURNING stock",
          [target_quantity, item_id]
        );
        currentStock = stockUpdateResult.rows[0].stock;

        await client.query(
          "UPDATE sales_orders SET reserved_quantity = reserved_quantity + $1, status = CASE WHEN reserved_quantity + $1 >= quantity THEN 'Hazır' ELSE status END WHERE id = $2",
          [target_quantity, sales_order_id]
        );
      } else {
        const stockUpdateResult = await client.query(
          "UPDATE items SET stock = stock + $1 WHERE id = $2 RETURNING stock",
          [target_quantity, item_id]
        );
        currentStock = stockUpdateResult.rows[0].stock;
      }

      await client.query(
        "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, 'Giriş', 'Kalite Onayı Üretim Girişi', $3)",
        [item_id, target_quantity, currentStock]
      );
    }

    if (shouldManageTransaction) await client.query("COMMIT");

    return {
      success: true,
      message: finalStatus === "Onaylandı"
        ? "Kalite süreci işlendi ve stoklar güncellendi."
        : "Kalite süreci işlendi, ürün reddedildi.",
    };
  } catch (error) {
    if (shouldManageTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldManageTransaction) client.release();
  }
}
