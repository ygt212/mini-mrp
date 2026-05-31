import pool from "@/lib/db";
import MainLayout from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = 'force-dynamic';

interface QualityControl {
  id: string;
  work_order_id: string;
  item_name?: string | null;
  target_quantity?: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export default async function KalitePage() {
  let records: QualityControl[] = [];
  let dbError = null;

  try {
    const result = await pool.query(`
      SELECT qc.*, i.name as item_name, wo.target_quantity 
      FROM quality_controls qc
      LEFT JOIN work_orders wo ON qc.work_order_id = wo.id
      LEFT JOIN items i ON wo.item_id = i.id
      ORDER BY qc.created_at DESC
    `);
    records = result.rows;
  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error);
    dbError = "Veritabanı bağlantı hatası oluştu.";
  }

  return (
    <MainLayout title="Kalite Kontrol">
      {dbError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
          {dbError}
        </div>
      ) : (
        <Card title="Kalite Kayıtları">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Kayıt ID</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">İş Emri Üretimi</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Ürün</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Durum</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Notlar</th>
                <th className="px-4 py-2 font-semibold">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 border-r border-gray-200">{record.id}</td>
                  <td className="px-4 py-2 border-r border-gray-200">{record.item_name} ({record.target_quantity})</td>
                  <td className="px-4 py-2 border-r border-gray-200">{record.item_name || '-'}</td>
                  <td className="px-4 py-2 border-r border-gray-200">
                    <Badge variant={record.status === 'Onaylandı' ? 'success' : record.status === 'Reddedildi' ? 'error' : 'default'}>
                      {record.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 truncate max-w-xs">{record.notes || '-'}</td>
                  <td className="px-4 py-2">{new Date(record.created_at).toLocaleString('tr-TR')}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </MainLayout>
  );
}
