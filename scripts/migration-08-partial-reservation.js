/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function up() {
  console.log('Migration 08: Adding partial reservation support...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE sales_orders 
      ADD COLUMN IF NOT EXISTS reserved_quantity INT DEFAULT 0;
    `);
    console.log(' - Added reserved_quantity to sales_orders');

    await client.query('COMMIT');
    console.log('Migration 08 completed successfully.');
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
