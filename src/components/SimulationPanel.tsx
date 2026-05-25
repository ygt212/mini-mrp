"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  name: string;
  type: string;
  stock: number;
  min_stock: number;
}

interface WorkOrder {
  id: string;
  item_id: string;
  item_name?: string | null;
  target_quantity: number;
  status: string;
}

interface QualityControl {
  id: string;
  work_order_id: string;
  status: string;
  notes: string | null;
}

interface PurchaseOrder {
  id: string;
  item_id: string;
  item_name?: string | null;
  quantity: number;
  received_quantity: number;
  status: string;
}

export default function SimulationPanel({
  items,
  purchaseOrders,
  workOrders,
  qualityControls,
}: {
  items: Item[];
  purchaseOrders: PurchaseOrder[];
  workOrders: WorkOrder[];
  qualityControls: QualityControl[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [consumeItemId, setConsumeItemId] = useState(items[0]?.id || "");
  const [consumeAmount, setConsumeAmount] = useState(1);

  const pendingWorkOrders = workOrders.filter((wo) => wo.status !== "Tamamlandı");
  const [completeWorkOrderId, setCompleteWorkOrderId] = useState(
    pendingWorkOrders[0]?.id || ""
  );
  const [advanceWorkOrderId, setAdvanceWorkOrderId] = useState(
    pendingWorkOrders[0]?.id || ""
  );

  const pendingQualityControls = qualityControls.filter(
    (qc) => qc.status === "Karantinada"
  );
  const [qualityControlId, setQualityControlId] = useState(
    pendingQualityControls[0]?.id || ""
  );

  const pendingPOs = purchaseOrders.filter((po) => po.status !== "Tam Teslim");
  const [poId, setPoId] = useState(pendingPOs[0]?.id || "");
  const [receiveAmount, setReceiveAmount] = useState(1);

  const handleConsume = async () => {
    if (!consumeItemId || consumeAmount <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/items/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: consumeItemId, amount: consumeAmount }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          "Tüketim başarılı!" +
            (data.autoOrdered ? " Otomatik sipariş oluşturuldu." : "")
        );
        router.refresh();
      } else {
        alert("Hata: " + data.error);
      }
    } catch {
      alert("Bir hata oluştu.");
    }
    setLoading(false);
  };

  const handleCompleteWorkOrder = async () => {
    if (!completeWorkOrderId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/work-orders/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId: completeWorkOrderId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        router.refresh();
      } else {
        alert("Hata: " + data.error);
      }
    } catch {
      alert("Bir hata oluştu.");
    }
    setLoading(false);
  };

  const handleAdvanceOperation = async () => {
    if (!advanceWorkOrderId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/work-orders/operations/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId: advanceWorkOrderId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        router.refresh();
      } else {
        alert("Hata: " + data.error);
      }
    } catch {
      alert("Bir hata oluştu.");
    }
    setLoading(false);
  };

  const handleQualityDecision = async (status: "Onaylandı" | "Reddedildi") => {
    if (!qualityControlId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/quality-controls/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualityControlId,
          status,
          notes: "Manuel kontrol paneli üzerinden işlem yapıldı.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        router.refresh();
      } else {
        alert("Hata: " + data.error);
      }
    } catch {
      alert("Bir hata oluştu.");
    }
    setLoading(false);
  };

  const handlePoStatus = async (action: "onayla" | "siparis_gec") => {
    if (!poId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/purchase-orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId, action }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        router.refresh();
      } else {
        alert("Hata: " + data.error);
      }
    } catch {
      alert("Bir hata oluştu.");
    }
    setLoading(false);
  };

  const handlePoReceive = async () => {
    if (!poId || receiveAmount <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/purchase-orders/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId, receiveAmount }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        router.refresh();
      } else {
        alert("Hata: " + data.error);
      }
    } catch {
      alert("Bir hata oluştu.");
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 text-black items-stretch">
      {/* Bölüm 1: Hammadde Tüket */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
        <h3 className="text-md font-bold text-slate-700 mb-3 border-b pb-2">
          Hammadde Tüket
        </h3>
        <div className="flex flex-col gap-3 flex-1">
          <select
            className="border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={consumeItemId}
            onChange={(e) => setConsumeItemId(e.target.value)}
          >
            <option value="" disabled>Ürün Seçin</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} (Stok: {item.stock})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            className="border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={consumeAmount}
            onChange={(e) => setConsumeAmount(Number(e.target.value))}
          />
          <div className="mt-auto pt-2">
            <button
              onClick={handleConsume}
              disabled={loading || !consumeItemId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-2.5 rounded text-sm font-semibold transition-colors shadow-sm"
            >
              {loading ? "İşleniyor..." : "Tüket"}
            </button>
          </div>
        </div>
      </div>

      {/* Bölüm 2: Üretimi Tamamla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
        <h3 className="text-md font-bold text-slate-700 mb-3 border-b pb-2">
          Üretimi Tamamla
        </h3>
        <div className="flex flex-col gap-3 flex-1">
          <select
            className="border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={completeWorkOrderId}
            onChange={(e) => setCompleteWorkOrderId(e.target.value)}
          >
            <option value="" disabled>İş Emri Seçin</option>
            {pendingWorkOrders.map((wo) => (
              <option key={wo.id} value={wo.id}>
                {wo.item_name || 'Bilinmeyen Ürün'} (Hedef: {wo.target_quantity})
              </option>
            ))}
          </select>
          <div className="mt-auto pt-2">
            <button
              onClick={handleCompleteWorkOrder}
              disabled={loading || !completeWorkOrderId}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white p-2.5 rounded text-sm font-semibold transition-colors shadow-sm"
            >
              {loading ? "İşleniyor..." : "İş Emrini Tamamla"}
            </button>
          </div>
        </div>
      </div>

      {/* Bölüm 3: Kalite Kararı */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
        <h3 className="text-md font-bold text-slate-700 mb-3 border-b pb-2">
          Kalite Kararı
        </h3>
        <div className="flex flex-col gap-3 flex-1">
          <select
            className="border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={qualityControlId}
            onChange={(e) => setQualityControlId(e.target.value)}
          >
            <option value="" disabled>Kalite Kaydı Seçin</option>
            {pendingQualityControls.map((qc) => (
              <option key={qc.id} value={qc.id}>
                QC-{qc.id.substring(0, 8)} (İş Emri: {qc.work_order_id.substring(0, 8)})
              </option>
            ))}
          </select>
          <div className="mt-auto pt-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQualityDecision("Onaylandı")}
              disabled={loading || !qualityControlId}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white p-2.5 rounded text-sm font-semibold transition-colors shadow-sm"
            >
              {loading ? "İşleniyor..." : "Onayla"}
            </button>
            <button
              onClick={() => handleQualityDecision("Reddedildi")}
              disabled={loading || !qualityControlId}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white p-2.5 rounded text-sm font-semibold transition-colors shadow-sm"
            >
              {loading ? "İşleniyor..." : "Reddet"}
            </button>
          </div>
        </div>
      </div>

      {/* Bölüm 4: Operasyon İlerlet */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
        <h3 className="text-md font-bold text-slate-700 mb-3 border-b pb-2">
          Operasyon Adımını İlerlet
        </h3>
        <div className="flex flex-col gap-3 flex-1">
          <select
            className="border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={advanceWorkOrderId}
            onChange={(e) => setAdvanceWorkOrderId(e.target.value)}
          >
            <option value="" disabled>İş Emri Seçin</option>
            {pendingWorkOrders.map((wo) => (
              <option key={wo.id} value={wo.id}>
                {wo.item_name || 'Bilinmeyen Ürün'} (Hedef: {wo.target_quantity})
              </option>
            ))}
          </select>
          <div className="mt-auto pt-2">
            <button
              onClick={handleAdvanceOperation}
              disabled={loading || !advanceWorkOrderId}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white p-2.5 rounded text-sm font-semibold transition-colors shadow-sm"
            >
              {loading ? "İşleniyor..." : "Sıradaki Adımı Tamamla"}
            </button>
          </div>
        </div>
      </div>

      {/* Bölüm 5: Satınalma & Mal Kabul */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
        <h3 className="text-md font-bold text-slate-700 mb-3 border-b pb-2">
          Satınalma & Mal Kabul
        </h3>
        <div className="flex flex-col gap-3 flex-1">
          <select
            className="border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={poId}
            onChange={(e) => setPoId(e.target.value)}
          >
            <option value="" disabled>Sipariş Seçin</option>
            {pendingPOs.map((po) => (
              <option key={po.id} value={po.id}>
                {po.item_name || 'Bilinmeyen'} ({po.received_quantity || 0}/{po.quantity}) - {po.status}
              </option>
            ))}
          </select>

          {poId && (
            <div className="mt-auto pt-2 flex flex-col gap-2">
              {pendingPOs.find(p => p.id === poId)?.status === "Bekliyor" && (
                <button
                  onClick={() => handlePoStatus("onayla")}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white p-2.5 rounded text-sm font-semibold transition-colors shadow-sm"
                >
                  {loading ? "İşleniyor..." : "Onayla"}
                </button>
              )}

              {pendingPOs.find(p => p.id === poId)?.status === "Onayland\u0131" && (
                <button
                  onClick={() => handlePoStatus("siparis_gec")}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white p-2.5 rounded text-sm font-semibold transition-colors shadow-sm"
                >
                  {loading ? "İşleniyor..." : "Tedarikçiye Geç"}
                </button>
              )}

              {(pendingPOs.find(p => p.id === poId)?.status === "Sipari\u015F Ge\u00E7ildi" || pendingPOs.find(p => p.id === poId)?.status === "K\u0131smi Teslim") && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    className="w-1/3 border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={receiveAmount}
                    onChange={(e) => setReceiveAmount(Number(e.target.value))}
                  />
                  <button
                    onClick={handlePoReceive}
                    disabled={loading}
                    className="w-2/3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white p-2 rounded text-sm font-semibold transition-colors shadow-sm"
                  >
                    {loading ? "İşleniyor..." : "Mal Kabul Yap"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
