const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    console.log("Adding reserved_quantity to items...");
    await client.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS reserved_quantity INT DEFAULT 0;");
    
    console.log("Adding sales_order_id to work_orders...");
    await client.query("ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL;");
    
    console.log("Adding sales_order_id to purchase_orders...");
    await client.query("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL;");
    
    await client.query("COMMIT");
    console.log("Migration applied successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
