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

export default function AdminPanelClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form 1: Yeni Ürün
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("hammadde");
  const [newStock, setNewStock] = useState(0);
  const [newMinStock, setNewMinStock] = useState(0);

  // Form 2: Stok Güncelle
  const [updateItemId, setUpdateItemId] = useState(items[0]?.id || "");
  const [updateStock, setUpdateStock] = useState(0);

  // Form 3: Yeni İş Emri
  const [woItemId, setWoItemId] = useState(items[0]?.id || "");
  const [woTargetQuantity, setWoTargetQuantity] = useState(1);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          type: newType,
          stock: newStock,
          minStock: newMinStock,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Ürün başarıyla eklendi.");
        setNewName("");
        setNewStock(0);
        setNewMinStock(0);
        router.refresh();
      } else {
        alert("Hata: " + data.error);
      }
    } catch {
      alert("Bir hata oluştu.");
    }
    setLoading(false);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateItemId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: updateItemId, newStock: updateStock }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Stok güncellendi.");
        setUpdateStock(0);
        router.refresh();
      } else {
        alert("Hata: " + data.error);
      }
    } catch {
      alert("Bir hata oluştu.");
    }
    setLoading(false);
  };

  const handleCreateWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woItemId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: woItemId,
          targetQuantity: woTargetQuantity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("İş emri oluşturuldu.");
        setWoTargetQuantity(1);
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Form 1: Yeni Ürün Ekle */}
      <div className="bg-white rounded border border-gray-300 p-5 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4 border-b border-gray-200 pb-2">
          Yeni Ürün Ekle
        </h3>
        <form onSubmit={handleAddItem} className="flex flex-col gap-3 flex-1">
          <input
            required
            type="text"
            placeholder="Ürün Adı"
            className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select
            className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          >
            <option value="hammadde">Hammadde</option>
            <option value="son_urun">Son Ürün</option>
          </select>
          <div className="flex gap-2">
            <div className="flex flex-col w-1/2">
              <label className="text-xs text-gray-500 mb-1">Mevcut Stok</label>
              <input
                required
                type="number"
                className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={newStock}
                onChange={(e) => setNewStock(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col w-1/2">
              <label className="text-xs text-gray-500 mb-1">Min Stok</label>
              <input
                required
                type="number"
                className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={newMinStock}
                onChange={(e) => setNewMinStock(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="mt-auto pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded p-2 text-sm font-semibold transition-colors"
            >
              {loading ? "İşleniyor..." : "Ekle"}
            </button>
          </div>
        </form>
      </div>

      {/* Form 2: Stok Güncelle */}
      <div className="bg-white rounded border border-gray-300 p-5 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4 border-b border-gray-200 pb-2">
          Stok Miktarını Ez
        </h3>
        <form onSubmit={handleUpdateStock} className="flex flex-col gap-3 flex-1">
          <select
            className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={updateItemId}
            onChange={(e) => setUpdateItemId(e.target.value)}
          >
            <option value="" disabled>
              Ürün Seçin
            </option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} (Stok: {i.stock})
              </option>
            ))}
          </select>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Yeni Stok</label>
            <input
              required
              type="number"
              className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={updateStock}
              onChange={(e) => setUpdateStock(Number(e.target.value))}
            />
          </div>
          <div className="mt-auto pt-2">
            <button
              type="submit"
              disabled={loading || !updateItemId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded p-2 text-sm font-semibold transition-colors"
            >
              {loading ? "İşleniyor..." : "Güncelle"}
            </button>
          </div>
        </form>
      </div>

      {/* Form 3: Yeni İş Emri Oluştur */}
      <div className="bg-white rounded border border-gray-300 p-5 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4 border-b border-gray-200 pb-2">
          Yeni İş Emri Oluştur
        </h3>
        <form onSubmit={handleCreateWO} className="flex flex-col gap-3 flex-1">
          <select
            className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={woItemId}
            onChange={(e) => setWoItemId(e.target.value)}
          >
            <option value="" disabled>
              Ürün Seçin
            </option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Hedef Miktar</label>
            <input
              required
              type="number"
              min="1"
              className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={woTargetQuantity}
              onChange={(e) => setWoTargetQuantity(Number(e.target.value))}
            />
          </div>
          <div className="mt-auto pt-2">
            <button
              type="submit"
              disabled={loading || !woItemId}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded p-2 text-sm font-semibold transition-colors"
            >
              {loading ? "İşleniyor..." : "İş Emri Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
