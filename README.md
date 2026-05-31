# Mini MRP Projesi

Bu proje, bir Malzeme İhtiyaç Planlaması (MRP) sisteminin temel özelliklerini barındıran bir Next.js uygulamasıdır.

## Özellikler

- Ürün Ağacı (BOM) Yönetimi
- Stok (Envanter) Takibi
- Satış Siparişleri (Sales Orders) ve Kısmi Rezervasyon Sistemi
- Üretim İş Emirleri (Work Orders) ve Satınalma Siparişleri (Purchase Orders) oluşturma
- MRP Motoru: Net İhtiyaç Hesaplama

## Kurulum ve Çalıştırma

Projeyi lokal ortamınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

```bash
# Bağımlılıkları yükleyin
npm install

# Veritabanı kurulumu (Gerekliyse)
# node scripts/setup-db.js vb. komutlarınızı çalıştırın

# Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açarak uygulamayı görüntüleyebilirsiniz.

## Veritabanı Migrations
Veritabanı üzerinde yeni güncellemeleri uygulamak için `scripts/migration-*.js` dosyaları kullanılmaktadır.

## Teknoloji Yığını
- Next.js (App Router)
- React
- PostgreSQL (`pg`)
- Tailwind CSS
