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
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        contact_info VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        quantity INT NOT NULL,
        order_date DATE DEFAULT CURRENT_DATE,
        target_delivery_date DATE,
        status VARCHAR(50) DEFAULT 'Bekliyor',
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE sales_orders ALTER COLUMN customer_id SET NOT NULL;
      ALTER TABLE sales_orders ALTER COLUMN item_id SET NOT NULL;
    `;

    await pool.query(sql);
    console.log("✅ Satış Siparişleri tabloları başarıyla oluşturuldu!");
  } catch (err) {
    console.error("❌ Tablo oluşturulurken hata:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
