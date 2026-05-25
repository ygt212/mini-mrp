/* eslint-disable @typescript-eslint/no-require-imports */
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
    await pool.query("UPDATE work_order_operations SET operation_name = 'Kesim/Hazırlık' WHERE operation_name LIKE '%Haz%rl%k%'");
    console.log("✅ Operasyon isimleri düzeltildi!");
  } catch (err) {
    console.error("❌ Hata:", err.message);
  } finally {
    await pool.end();
  }
}

main();
