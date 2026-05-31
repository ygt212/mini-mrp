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

export default async function DashboardPage() {
  let items: Item[] = [];
  let purchaseOrders: PurchaseOrder[] = [];
  let workOrders: WorkOrder[] = [];
  let qualityControls: QualityControl[] = [];
  let dbError = null;

  try {
    const itemsResult = await pool.query("SELECT * FROM items ORDER BY created_at DESC");
    const purchaseOrdersResult = await pool.query(`
      SELECT po.*, i.name as item_name 
      FROM purchase_orders po 
      LEFT JOIN items i ON po.item_id = i.id 
      ORDER BY po.created_at DESC
    `);
    const workOrdersResult = await pool.query(`
      SELECT wo.*, i.name as item_name 
      FROM work_orders wo 
      LEFT JOIN items i ON wo.item_id = i.id 
      ORDER BY wo.created_at DESC
    `);
    const qualityControlsResult = await pool.query(`
      SELECT qc.*, i.name as item_name, wo.target_quantity 
      FROM quality_controls qc
      LEFT JOIN work_orders wo ON qc.work_order_id = wo.id
      LEFT JOIN items i ON wo.item_id = i.id
      ORDER BY qc.created_at DESC
    `);

    items = itemsResult.rows;
    purchaseOrders = purchaseOrdersResult.rows;
    workOrders = workOrdersResult.rows;
    qualityControls = qualityControlsResult.rows;
  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error);
    dbError = "Veritabanına bağlanırken bir hata oluştu. Lütfen bağlantınızı kontrol edin.";
  }

  const kpiKritikStok = items.filter(i => i.stock < i.min_stock).length;
  const kpiKarantina = qualityControls.filter(qc => qc.status === 'Karantinada').length;
  const kpiAcikSatinAlmalar = purchaseOrders.filter(po => po.status !== 'Tam Teslim').length;

  return (
    <MainLayout title="Mini MRP Yönetim Paneli">
      {dbError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
          {dbError}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
          </div>

          <SimulationPanel items={items} purchaseOrders={purchaseOrders} workOrders={workOrders} qualityControls={qualityControls} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Stok Durumu Tablosu */}
            <Card title="Stok Durumu">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/2">Ürün Adı</th>
                    <th className="px-4 py-2 font-semibold">Stok / Min</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td></tr>
                  ) : items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-200">{item.name}</td>
                      <td className="px-4 py-2">
                        <Badge variant={item.stock < item.min_stock ? 'error' : 'success'}>
                          {item.stock} / {item.min_stock}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Satın Alma Tablosu */}
            <Card title="Satın Alma Siparişleri">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">Sipariş ID</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-2/4">Ürün Adı</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200">Miktar</th>
                    <th className="px-4 py-2 font-semibold">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td></tr>
                  ) : purchaseOrders.map((po) => (
                    <tr key={po.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-200 font-mono text-xs">{po.id.substring(0, 8)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{po.item_name || 'Bilinmiyor'}</td>
                      <td className="px-4 py-2 border-r border-gray-200 text-right">Alınan: {po.received_quantity || 0} / Toplam: {po.quantity}</td>
                      <td className="px-4 py-2">
                        <Badge variant="info">{po.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Üretim İş Emirleri Tablosu */}
            <Card title="Üretim İş Emirleri">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/4">İş Emri ID</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-2/4">Ürün Adı</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200">Hedef</th>
                    <th className="px-4 py-2 font-semibold">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td></tr>
                  ) : workOrders.map((wo) => (
                    <tr key={wo.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-200 font-mono text-xs">{wo.id.substring(0, 8)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{wo.item_name || 'Bilinmiyor'}</td>
                      <td className="px-4 py-2 border-r border-gray-200 text-right">{wo.target_quantity}</td>
                      <td className="px-4 py-2">
                        <Badge variant={wo.status === 'Tamamlandı' ? 'success' : 'warning'}>
                          {wo.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Kalite Kontrol Tablosu */}
            <Card title="Kalite Kontrol">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/5">Kalite ID</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-1/5">İş Emri Üretimi</th>
                    <th className="px-4 py-2 font-semibold border-r border-gray-200 w-2/5">Notlar</th>
                    <th className="px-4 py-2 font-semibold w-1/5">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityControls.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td></tr>
                  ) : qualityControls.map((qc) => (
                    <tr key={qc.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-200 font-mono text-xs">{qc.id.substring(0, 8)}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{qc.item_name} ({qc.target_quantity})</td>
                      <td className="px-4 py-2 border-r border-gray-200 truncate max-w-[150px]" title={qc.notes || undefined}>{qc.notes || '-'}</td>
                      <td className="px-4 py-2">
                        <Badge variant={qc.status === 'Onaylandı' ? 'success' : qc.status === 'Reddedildi' ? 'error' : 'default'}>
                          {qc.status}
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
