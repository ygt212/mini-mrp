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

    // 1. Tüm verileri sil
    console.log("Mevcut veriler temizleniyor...");
    await client.query("TRUNCATE items CASCADE");

    // 2. Hammaddeleri Ekle
    console.log("Hammaddeler ekleniyor...");
    const ahsapRes = await client.query(
      "INSERT INTO items (name, type, stock, min_stock) VALUES ($1, $2, $3, $4) RETURNING id",
      ["Ahşap Panel", "hammadde", 150, 200]
    );
    const ahsapId = ahsapRes.rows[0].id;

    const metalRes = await client.query(
      "INSERT INTO items (name, type, stock, min_stock) VALUES ($1, $2, $3, $4) RETURNING id",
      ["Metal Ayak", "hammadde", 400, 100]
    );
    const metalId = metalRes.rows[0].id;

    const vidaRes = await client.query(
      "INSERT INTO items (name, type, stock, min_stock) VALUES ($1, $2, $3, $4) RETURNING id",
      ["Vida Seti", "hammadde", 1000, 500]
    );
    const vidaId = vidaRes.rows[0].id;

    // 3. Son Ürünü Ekle
    console.log("Son ürün ekleniyor...");
    const masaRes = await client.query(
      "INSERT INTO items (name, type, stock, min_stock) VALUES ($1, $2, $3, $4) RETURNING id",
      ["Çalışma Masası", "son_urun", 5, 20]
    );
    const masaId = masaRes.rows[0].id;

    // 4. Stok İlk Giriş Loglarını Ekle
    console.log("Stok logları işleniyor...");
    const logs = [
      { id: ahsapId, stock: 150 },
      { id: metalId, stock: 400 },
      { id: vidaId, stock: 1000 },
      { id: masaId, stock: 5 },
    ];
    for (const item of logs) {
      await client.query(
        "INSERT INTO inventory_transactions (item_id, quantity_change, transaction_type, reference_details, post_transaction_stock) VALUES ($1, $2, 'Giri\u015F', 'Senaryo İlk Stok', $3)",
        [item.id, item.stock, item.stock]
      );
    }

    // 5. Ürün Ağacını (BOM) Ekle
    console.log("Ürün reçetesi (BOM) oluşturuluyor...");
    await client.query("INSERT INTO bill_of_materials (product_id, raw_material_id, quantity) VALUES ($1, $2, $3)", [masaId, ahsapId, 1]);
    await client.query("INSERT INTO bill_of_materials (product_id, raw_material_id, quantity) VALUES ($1, $2, $3)", [masaId, metalId, 4]);
    await client.query("INSERT INTO bill_of_materials (product_id, raw_material_id, quantity) VALUES ($1, $2, $3)", [masaId, vidaId, 20]);

    // 6. Örnek Satın Alma Siparişi Ekle
    console.log("Satın Alma siparişi ekleniyor...");
    await client.query(
      "INSERT INTO purchase_orders (item_id, quantity, received_quantity, status) VALUES ($1, $2, $3, $4)",
      [ahsapId, 100, 0, "Sipari\u015F Ge\u00E7ildi"]
    );

    // 7. Örnek Üretim İş Emri
    console.log("Üretim iş emri ekleniyor...");
    const woRes = await client.query(
      "INSERT INTO work_orders (item_id, target_quantity, status) VALUES ($1, $2, 'Planland\u0131') RETURNING id",
      [masaId, 10]
    );
    const woId = woRes.rows[0].id;

    // Rota adımlarını (Operasyonları) oluştur
    const operations = [
      { step: 1, name: "Kesim/Haz\u0131rl\u0131k" },
      { step: 2, name: "Montaj" },
      { step: 3, name: "Paketleme" },
    ];

    for (const op of operations) {
      await client.query(
        "INSERT INTO work_order_operations (work_order_id, operation_name, step_order, status) VALUES ($1, $2, $3, 'Bekliyor')",
        [woId, op.name, op.step]
      );
    }

    await client.query("COMMIT");
    console.log("✅ Mini Senaryo verisi başarıyla yüklendi!");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Senaryo yüklenirken hata oluştu:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
