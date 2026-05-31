import pool from "@/lib/db";
import MainLayout from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = 'force-dynamic';

interface WorkOrderOperation {
  id: string;
  work_order_id: string;
  operation_name: string;
  step_order: number;
  status: string;
}

interface WorkOrder {
  id: string;
  item_id: string;
  item_name?: string | null;
  target_quantity: number;
  status: string;
  created_at: string;
  operations?: { id: string; operation_name: string; step_order: number; status: string }[];
}

export default async function UretimPage() {
  let orders: WorkOrder[] = [];
  let dbError = null;

  try {
    const result = await pool.query(`
      SELECT wo.*, i.name as item_name 
      FROM work_orders wo 
      LEFT JOIN items i ON wo.item_id = i.id 
      ORDER BY wo.created_at DESC
    `);
    const opsResult = await pool.query(`SELECT * FROM work_order_operations ORDER BY step_order ASC`);
    orders = result.rows.map(wo => ({
      ...wo,
      operations: opsResult.rows.filter((op: WorkOrderOperation) => op.work_order_id === wo.id)
    }));
  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error);
    dbError = "Veritabanı bağlantı hatası oluştu.";
  }

  return (
    <MainLayout title="Üretim Modülü">
      {dbError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
          {dbError}
        </div>
      ) : (
        <Card title="İş Emirleri">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                <th className="px-4 py-2 font-semibold border-r border-gray-200">İş Emri ID</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Ürün Adı</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Hedef Miktar</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Durum</th>
                <th className="px-4 py-2 font-semibold border-r border-gray-200">Operasyon Rotası</th>
                <th className="px-4 py-2 font-semibold">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 border-r border-gray-200">{order.id}</td>
                  <td className="px-4 py-2 border-r border-gray-200">{order.item_name}</td>
                  <td className="px-4 py-2 border-r border-gray-200">{order.target_quantity}</td>
                  <td className="px-4 py-2 border-r border-gray-200">
                    <Badge variant={order.status === 'Tamamlandı' ? 'success' : 'warning'}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200">
                    <div className="flex flex-wrap gap-1">
                      {order.operations && order.operations.length > 0 ? (
                        order.operations.map(op => (
                          <span
                            key={op.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${op.status === 'Tamamlandı' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                              }`}
                          >
                            {op.step_order}. {op.operation_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic text-xs">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">{new Date(order.created_at).toLocaleString('tr-TR')}</td>
                </tr>
              ))}
              {orders.length === 0 && (
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
