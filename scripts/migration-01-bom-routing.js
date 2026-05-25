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
      CREATE TABLE IF NOT EXISTS bill_of_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES items(id) ON DELETE CASCADE,
        raw_material_id UUID REFERENCES items(id) ON DELETE CASCADE,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS work_order_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
        operation_name VARCHAR(255) NOT NULL,
        step_order INT NOT NULL,
        status VARCHAR(50) DEFAULT 'Bekliyor'
      );
    `;

    await pool.query(sql);
    console.log("✅ Reçete ve Operasyon Rota tabloları başarıyla oluşturuldu!");
  } catch (err) {
    console.error("❌ Tablo oluşturulurken hata:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
