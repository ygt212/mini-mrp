/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// .env.local dosyasını manuel oku
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
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("HATA: DATABASE_URL ortam değişkeni tanımlı değil.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID REFERENCES items(id) ON DELETE CASCADE,
        quantity_change INT NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        reference_details VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await pool.query(sql);
    console.log("✅ Stok Hareketleri (inventory_transactions) tablosu başarıyla oluşturuldu!");
  } catch (err) {
    console.error("❌ Tablo oluşturulurken hata:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
