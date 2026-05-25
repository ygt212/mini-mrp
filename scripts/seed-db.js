/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// .env.local dosyasını manuel oku
const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
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
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("HATA: DATABASE_URL ortam değişkeni tanımlı değil.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query("BEGIN");

    // Tüm tabloları temizle
    await pool.query(
      "TRUNCATE TABLE items, purchase_orders, work_orders, quality_controls CASCADE;"
    );

    // items tablosuna başlangıç verilerini ekle
    const insertItemsQuery = `
      INSERT INTO items (name, type, stock, min_stock)
      VALUES 
        ('Çelik Levha', 'hammadde', 120, 50),
        ('Bakır Kablo', 'hammadde', 40, 100),
        ('Motor Bloğu', 'son_urun', 0, 10)
      RETURNING id, name;
    `;
    const itemsResult = await pool.query(insertItemsQuery);

    // Motor Bloğu'nun ID'sini bul
    const motorBlogu = itemsResult.rows.find((i) => i.name === "Motor Bloğu");

    // Motor Bloğu için örnek bir iş emri oluştur
    if (motorBlogu) {
      await pool.query(
        "INSERT INTO work_orders (item_id, target_quantity, status) VALUES ($1, $2, $3)",
        [motorBlogu.id, 5, "Planlandı"]
      );
    }

    await pool.query("COMMIT");
    console.log("✅ Başlangıç verileri başarıyla eklendi!");
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Veri eklenirken hata:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
