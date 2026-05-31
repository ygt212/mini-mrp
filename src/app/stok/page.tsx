import pool from "@/lib/db";
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
  auto_order_quantity: number;
  created_at: string;
}
interface InventoryTransaction {
  id: string;
  item_id: string;
  item_name: string;
  quantity_change: number;
  transaction_type: string;
  reference_details: string;
  post_transaction_stock: number;
  created_at: string;
}


export default async function StokPage() {
  let items: Item[] = [];
  let transactions: InventoryTransaction[] = [];

  let dbError = null;

  try {
    const result = await pool.query("SELECT * FROM items ORDER BY created_at DESC");
    items = result.rows;

    const txResult = await pool.query(`
      SELECT it.*, i.name as item_name 
      FROM inventory_transactions it 
      JOIN items i ON it.item_id = i.id 
      ORDER BY it.created_at DESC
    `);
    transactions = txResult.rows;
  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error);
    dbError = "Veritabanı bağlantı hatası oluştu.";
  }

  return (
    <MainLayout title="Stok Yönetimi">
      {dbError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
          {dbError}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Card title="Stok Listesi">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">ID</th>
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">Ürün Adı</th>
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">Tip</th>
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">Stok</th>
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">Min Stok</th>
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">Oto. Sipariş</th>
                  <th className="px-4 py-2 font-semibold">Oluşturulma Tarihi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 border-r border-gray-200">{item.id}</td>
                    <td className="px-4 py-2 border-r border-gray-200">{item.name}</td>
                    <td className="px-4 py-2 border-r border-gray-200">{item.type}</td>
                    <td className="px-4 py-2 border-r border-gray-200">
                      <Badge variant={item.stock < item.min_stock ? 'error' : 'success'}>
                        {item.stock}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200">{item.min_stock}</td>
                    <td className="px-4 py-2 border-r border-gray-200">{item.auto_order_quantity}</td>
                    <td className="px-4 py-2">{new Date(item.created_at).toLocaleString('tr-TR')}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card title="Hareket Geçmişi">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">Tarih</th>
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">Ürün Adı</th>
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">İşlem Tipi</th>
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">Değişim Miktarı</th>
                  <th className="px-4 py-2 font-semibold border-r border-gray-200">İşlem Sonrası Bakiye</th>
                  <th className="px-4 py-2 font-semibold">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 border-r border-gray-200">{new Date(tx.created_at).toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-2 border-r border-gray-200 font-medium">{tx.item_name}</td>
                    <td className="px-4 py-2 border-r border-gray-200">{tx.transaction_type}</td>
                    <td className="px-4 py-2 border-r border-gray-200">
                      <Badge variant={tx.quantity_change > 0 ? 'success' : 'error'}>
                        {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200 font-semibold">{tx.post_transaction_stock}</td>
                    <td className="px-4 py-2">{tx.reference_details || '-'}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
