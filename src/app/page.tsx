import pool from "@/lib/db";

import SimulationPanel from "@/components/SimulationPanel";
import MainLayout from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = 'force-dynamic';

interface Item {
  id: string;
  name: string;
  type: string;
  stock: number;
  min_stock: number;
  auto_order_quantity?: number;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  item_id: string;
  item_name?: string | null;
  quantity: number;
  received_quantity: number;
  status: string;
  created_at: string;
}

interface WorkOrder {
  id: string;
  item_id: string;
  item_name?: string | null;
  target_quantity: number;
  status: string;
  created_at: string;
  sales_order_id?: string | null;
}

interface QualityControl {
  id: string;
  work_order_id: string;
  item_name?: string | null;
  target_quantity?: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface SalesOrder {
  id: string;
  status: string;
  target_delivery_date: string | null;
  customer_name?: string;
  item_name?: string;
  quantity: number;
}

export default async function DashboardPage() {
  let items: Item[] = [];
  let purchaseOrders: PurchaseOrder[] = [];
  let workOrders: WorkOrder[] = [];
  let qualityControls: QualityControl[] = [];
  let salesOrders: SalesOrder[] = [];
  let dbError = null;

  try {
    try {
      const itemsResult = await pool.query("SELECT * FROM items ORDER BY created_at DESC");
      items = itemsResult.rows;
    } catch (e) {
      console.error("Dashboard Veri Çekme Hatası:", e);
    }

    try {
      const purchaseOrdersResult = await pool.query(`
        SELECT po.*, i.name as item_name
        FROM purchase_orders po
        LEFT JOIN items i ON po.item_id = i.id
        ORDER BY po.created_at DESC
      `);
      purchaseOrders = purchaseOrdersResult.rows;
    } catch (e) {
      console.error("Dashboard Veri Çekme Hatası:", e);
    }

    try {
      const workOrdersResult = await pool.query(`
        SELECT wo.*, i.name as item_name
        FROM work_orders wo
        LEFT JOIN items i ON wo.item_id = i.id
        ORDER BY wo.created_at DESC
      `);
      workOrders = workOrdersResult.rows;
    } catch (e) {
      console.error("Dashboard Veri Çekme Hatası:", e);
    }

    try {
      const qualityControlsResult = await pool.query(`
        SELECT qc.*, i.name as item_name, wo.target_quantity
        FROM quality_controls qc
        LEFT JOIN work_orders wo ON qc.work_order_id = wo.id
        LEFT JOIN items i ON wo.item_id = i.id
        ORDER BY qc.created_at DESC
      `);
      qualityControls = qualityControlsResult.rows;
    } catch (e) {
      console.error("Dashboard Veri Çekme Hatası:", e);
    }

    try {
      const salesOrdersResult = await pool.query(`
        SELECT so.*, c.name as customer_name, i.name as item_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN items i ON so.item_id = i.id
        ORDER BY so.created_at DESC
      `);
      salesOrders = salesOrdersResult.rows;
    } catch (e) {
      console.error("Dashboard Veri Çekme Hatası:", e);
    }
  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error);
    dbError = "Veritabanına bağlanırken bir hata oluştu. Lütfen bağlantınızı kontrol edin.";
  }

  const kpiKritikStok = items.filter(i => i.stock < i.min_stock).length;
  const kpiKarantina = qualityControls.filter(qc => qc.status === 'Karantinada').length;
  const kpiAcikSatinAlmalar = purchaseOrders.filter(po => po.status !== 'Tam Teslim').length;

  const kpiAcikSatisSiparisleri = salesOrders.filter(so => so.status !== 'Tamamlandı' && so.status !== 'İptal' && so.status !== 'Teslim Edildi').length;

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const kpiGecikenTeslimatlar = salesOrders.filter(so => {
    if (so.status !== 'Tamamlandı' && so.status !== 'İptal' && so.status !== 'Teslim Edildi' && so.target_delivery_date) {
      const deliveryDate = new Date(so.target_delivery_date);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate <= bugun;
    }
    return false;
  }).length;

  const hazirSiparisler = salesOrders.filter(so => so.status === 'Hazır');
  const bekleyenSiparisler = salesOrders.filter(so => so.status !== 'Hazır' && so.status !== 'Tamamlandı' && so.status !== 'İptal' && so.status !== 'Teslim Edildi');

  const riskliSiparisler = salesOrders.filter(so => {
    if (so.status === 'Tamamlandı' || so.status === 'Teslim Edildi' || so.status === 'İptal' || !so.target_delivery_date) return false;
    const delivery = new Date(so.target_delivery_date);
    const diffDays = Math.ceil((delivery.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return diffDays <= 2;
  });

  const bagliUretimler = workOrders.filter(wo => wo.sales_order_id && wo.status !== 'Tamamlandı');

  return (
    <MainLayout title="Mini MRP Yönetim Paneli">
      {dbError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
          {dbError}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
              <p className="text-red-700 text-sm font-semibold uppercase">Kritik Stok (Eksik)</p>
              <p className="text-3xl font-bold text-red-800 mt-1">{kpiKritikStok}</p>
            </div>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm">
              <p className="text-orange-700 text-sm font-semibold uppercase">Karantinadaki Kalite</p>
              <p className="text-3xl font-bold text-orange-800 mt-1">{kpiKarantina}</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
              <p className="text-blue-700 text-sm font-semibold uppercase">Açık Satınalmalar</p>
              <p className="text-3xl font-bold text-blue-800 mt-1">{kpiAcikSatinAlmalar}</p>
            </div>
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded shadow-sm">
              <p className="text-indigo-700 text-sm font-semibold uppercase">Açık Siparişler</p>
              <p className="text-3xl font-bold text-indigo-800 mt-1">{kpiAcikSatisSiparisleri}</p>
            </div>
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded shadow-sm">
              <p className="text-rose-700 text-sm font-semibold uppercase">Geciken / Yaklaşan</p>
              <p className="text-3xl font-bold text-rose-800 mt-1">{kpiGecikenTeslimatlar}</p>
            </div>
          </div>

          <SimulationPanel items={items} purchaseOrders={purchaseOrders} workOrders={workOrders} qualityControls={qualityControls} salesOrders={salesOrders} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Hazır Siparişler Tablosu */}
            <Card title="Stoktan Karşılanabilir (Hazır) Siparişler">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Sipariş ID</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Müşteri</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Ürün</th>
                    <th className="px-4 py-2 font-semibold">Miktar</th>
                  </tr>
                </thead>
                <tbody>
                  {hazirSiparisler.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td></tr>
                  ) : hazirSiparisler.map((so) => (
                    <tr key={so.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-200 font-mono text-xs">{so.id.substring(0, 8)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{so.customer_name}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{so.item_name}</td>
                      <td className="px-4 py-2 text-right">
                        <Badge variant="success">{so.quantity}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Bekleyen Siparişler Tablosu */}
            <Card title="Üretim Bekleyen Siparişler">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Sipariş ID</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Müşteri</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Ürün</th>
                    <th className="px-4 py-2 font-semibold">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {bekleyenSiparisler.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td></tr>
                  ) : bekleyenSiparisler.map((so) => (
                    <tr key={so.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-200 font-mono text-xs">{so.id.substring(0, 8)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{so.customer_name}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{so.item_name}</td>
                      <td className="px-4 py-2">
                        <Badge variant="warning">{so.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Gecikme Riskli Siparişler Tablosu */}
            <Card title="Gecikme Riskli Siparişler">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Sipariş ID</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-2/4">Müşteri / Ürün</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200">Teslim Tarihi</th>
                    <th className="px-4 py-2 font-semibold">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {riskliSiparisler.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-3 text-gray-400 italic text-center">Riskli sipariş bulunamadı.</td></tr>
                  ) : riskliSiparisler.map((so) => (
                    <tr key={so.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-200 font-mono text-xs">{so.id.substring(0, 8)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{so.customer_name} - {so.item_name}</td>
                      <td className="px-4 py-2 border-r border-gray-200">
                        {so.target_delivery_date ? new Date(so.target_delivery_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="error">{so.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Bağlı Üretimler Tablosu */}
            <Card title="Bağlı Üretimler">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">İş Emri ID</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Sipariş ID</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Ürün</th>
                    <th className="px-4 py-2 font-semibold">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {bagliUretimler.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td></tr>
                  ) : bagliUretimler.map((wo) => (
                    <tr key={wo.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-200 font-mono text-xs">{wo.id.substring(0, 8)}</td>
                      <td className="px-4 py-2 border-r border-gray-200 font-mono text-xs">{wo.sales_order_id ? wo.sales_order_id.substring(0, 8) : '-'}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{wo.item_name}</td>
                      <td className="px-4 py-2">
                        <Badge variant={wo.status === 'Tamamlandı' ? 'success' : 'info'}>
                          {wo.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

          </div>
        </>
      )}
    </MainLayout>
  );
}
