/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env.local");
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
    await pool.query("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS received_quantity INT DEFAULT 0;");
    console.log("✅ Satınalma Siparişlerine received_quantity başarıyla eklendi!");
  } catch (err) {
    console.error("❌ Hata:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
