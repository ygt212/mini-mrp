"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Recommendation {
  type: 'MAKE' | 'BUY';
  itemId: string;
  itemName: string;
  quantity: number;
  salesOrderId?: string;
  reason?: 'sales_order_shortage' | 'waiting_work_order_material' | 'stock_shortage';
  sourceSalesOrderIds?: string[];
  sourceWorkOrderIds?: string[];
}

export default function PlanlamaPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMRP = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mrp/run');
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMRP();
  }, []);

  const handleAction = async (rec: Recommendation, index: number) => {
    setActionLoading(`${index}`);
    try {
      const res = await fetch('/api/mrp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: rec.type,
          itemId: rec.itemId,
          quantity: rec.quantity,
          salesOrderId: rec.salesOrderId,
          sourceSalesOrderIds: rec.sourceSalesOrderIds,
        })
      });

      if (res.ok) {
        alert("Aksiyon başarıyla oluşturuldu.");
        fetchMRP(); // Refresh
      } else {
        const errorData = await res.json();
        alert(`Hata: ${errorData.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Bir hata oluştu.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <MainLayout title="MRP Planlama ve Öneriler">
      <Card title="MRP Motoru Önerileri">
        <div className="p-5 pb-0 mb-4">
          <button 
            onClick={fetchMRP} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Hesaplanıyor..." : "MRP'yi Yeniden Çalıştır"}
          </button>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-gray-500 p-5 pt-0">Şu anda planlama önerisi bulunmamaktadır.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200 text-xs text-gray-600 uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold text-gray-500">Tipi</th>
                  <th className="px-6 py-3 font-semibold text-gray-500">Ürün</th>
                  <th className="px-6 py-3 font-semibold text-gray-500 text-right">Miktar</th>
                  <th className="px-6 py-3 font-semibold text-gray-500">Sebep</th>
                  <th className="px-6 py-3 font-semibold text-gray-500">Bağlı Kaynak</th>
                  <th className="px-6 py-3 font-semibold text-gray-500 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Badge variant={rec.type === 'MAKE' ? 'info' : 'warning'}>
                        {rec.type === 'MAKE' ? 'ÜRETİM' : 'SATINALMA'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">{rec.itemName || rec.itemId}</td>
                    <td className="px-6 py-4 text-sm text-gray-800 text-right font-medium">{rec.quantity}</td>
                    <td className="px-6 py-4 text-xs">
                      {rec.reason === 'waiting_work_order_material' ? (
                        <Badge variant="warning">Malzeme Bekliyor</Badge>
                      ) : rec.reason === 'sales_order_shortage' ? (
                        <Badge variant="info">Sipariş İhtiyacı</Badge>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                      {rec.salesOrderId ? (
                        <span title={rec.salesOrderId}>SS: {rec.salesOrderId.substring(0, 8)}</span>
                      ) : rec.sourceSalesOrderIds && rec.sourceSalesOrderIds.length > 0 ? (
                        <span title={rec.sourceSalesOrderIds.join(', ')}>
                          {rec.sourceSalesOrderIds.length} sipariş
                          {rec.sourceWorkOrderIds && rec.sourceWorkOrderIds.length > 0 && (
                            <> + {rec.sourceWorkOrderIds.length} iş emri</>
                          )}
                        </span>
                      ) : rec.sourceWorkOrderIds && rec.sourceWorkOrderIds.length > 0 ? (
                        <span title={rec.sourceWorkOrderIds.join(', ')}>
                          {rec.sourceWorkOrderIds.length} iş emri
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleAction(rec, idx)} 
                        disabled={actionLoading === `${idx}`}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === `${idx}` ? 'İşleniyor...' : 'Aksiyona Çevir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </MainLayout>
  );
}
