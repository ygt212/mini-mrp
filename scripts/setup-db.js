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
    console.error(".env.local dosyasına Supabase bağlantı dizesini ekleyin.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const schemaPath = path.resolve(__dirname, "..", "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");

    await pool.query(sql);
    console.log("✅ Tüm tablolar başarıyla oluşturuldu!");
  } catch (err) {
    console.error("❌ Tablo oluşturulurken hata:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
