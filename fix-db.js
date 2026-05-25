const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx);
  const value = trimmed.slice(idx + 1).replace(/^"|"$/g, "");
  process.env[key] = value;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const res = await pool.query("SELECT DISTINCT status FROM work_orders");
    console.log("Work order statuses:", res.rows);
    
    const opRes = await pool.query("SELECT DISTINCT status FROM work_order_operations");
    console.log("Operation statuses:", opRes.rows);

    await pool.query("UPDATE work_orders SET status = 'Üretimde' WHERE status LIKE '%retimde%'");
    await pool.query("UPDATE work_orders SET status = 'Tamamlandı' WHERE status LIKE '%amamland%'");
    await pool.query("UPDATE work_order_operations SET status = 'Tamamlandı' WHERE status LIKE '%amamland%'");
    
    console.log("DB updated successfully with correct UTF-8 strings.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
