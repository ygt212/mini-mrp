/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function up() {
  console.log('Migration 07: Adding MRP reservation and pegging links...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Stok rezervasyonu için reserved_quantity
    await client.query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS reserved_quantity INT DEFAULT 0;
    `);
    console.log(' - Added reserved_quantity to items');

    // 2. İş emrini talebe bağlamak için sales_order_id
    await client.query(`
      ALTER TABLE work_orders 
      ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL;
    `);
    console.log(' - Added sales_order_id to work_orders');

    // 3. Satın almayı talebe bağlamak için sales_order_id
    await client.query(`
      ALTER TABLE purchase_orders 
      ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL;
    `);
    console.log(' - Added sales_order_id to purchase_orders');

    await client.query('COMMIT');
    console.log('Migration 07 completed successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

up().catch((err) => {
  console.error(err);
  process.exit(1);
});
