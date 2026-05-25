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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    console.log("Veritabanı güncelleniyor: items tablosuna auto_order_quantity ekleniyor...");
    
    await client.query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS auto_order_quantity INT NOT NULL DEFAULT 50;
    `);

    await client.query("COMMIT");
    console.log("✅ Başarılı! auto_order_quantity sütunu eklendi.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Hata oluştu:", error);
  } finally {
    client.release();
    pool.end();
  }
}

main();
