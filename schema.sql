-- Mini MRP Veritabanı Şeması

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,           -- hammadde, son_urun
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INT NOT NULL,
  received_quantity INT DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Bekliyor',  -- Bekliyor, Yolda, Teslim Alındı
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  target_quantity INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Planlandı',  -- Planlandı, Üretimde, Tamamlandı
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'Karantinada',  -- Karantinada, Onaylandı, Reddedildi
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity_change INT NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  reference_details VARCHAR(255),
  post_transaction_stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
