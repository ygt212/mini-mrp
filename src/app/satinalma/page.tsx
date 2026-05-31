import pool from "@/lib/db";
import MainLayout from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = 'force-dynamic';

interface PurchaseOrder {
  id: string;
  item_id: string;
  item_name?: string | null;
  quantity: number;
  received_quantity: number;
  status: string;
  created_at: string;
}

export default async function SatinalmaPage() {
  let orders: PurchaseOrder[] = [];
  let dbError = null;

  try {
    const result = await pool.query(`
      SELECT po.*, i.name as item_name 
      FROM purchase_orders po 
      LEFT JOIN items i ON po.item_id = i.id 
      ORDER BY po.created_at DESC
    `);
    orders = result.rows;
  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error);
    dbError = "Veritabanı bağlantı hatası oluştu.";
  }

  return (
    <MainLayout title="Satın Alma Modülü">
      {dbError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
          {dbError}
        </div>
      ) : (
        <Card title="Satın Alma Siparişleri">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Sipariş ID</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Ürün Adı</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Alınan / Toplam Miktar</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Durum</th>
                <th className="px-4 py-2 font-semibold">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 border-r border-gray-200">{order.id}</td>
                  <td className="px-4 py-2 border-r border-gray-200">{order.item_name}</td>
                  <td className="px-4 py-2 border-r border-gray-200">{order.received_quantity || 0} / {order.quantity}</td>
                  <td className="px-4 py-2 border-r border-gray-200">
                    <Badge variant={order.status === 'Tam Teslim' ? 'success' : 'info'}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{new Date(order.created_at).toLocaleString('tr-TR')}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </MainLayout>
  );
}
