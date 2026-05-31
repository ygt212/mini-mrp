"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface Customer { id: string; name: string; contact_info?: string; }
export interface Item { id: string; name: string; stock: number; }
export interface SalesOrder { id: string; customer_name: string; item_name: string; quantity: number; status: string; target_delivery_date: string | null; created_at: string; }

export default function SalesClient({ initialOrders, customers, items }: { initialOrders: SalesOrder[], customers: Customer[], items: Item[] }) {
  const router = useRouter();
  
  const [customerForm, setCustomerForm] = useState({ name: "", contactInfo: "" });
  const [orderForm, setOrderForm] = useState({ customerId: "", itemId: "", quantity: 1, targetDeliveryDate: "" });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Bir hata oluştu");
      
      setMessage({ text: "Müşteri başarıyla eklendi.", type: "success" });
      setCustomerForm({ name: "", contactInfo: "" });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : String(err), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });
    try {
      const res = await fetch("/api/sales-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Bir hata oluştu");
      
      setMessage({ text: "Sipariş başarıyla eklendi.", type: "success" });
      setOrderForm({ customerId: "", itemId: "", quantity: 1, targetDeliveryDate: "" });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : String(err), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'Bekliyor': return 'default';
      case 'Üretimde': return 'info';
      case 'Hazır': return 'success';
      case 'Teslim Edildi': return 'success';
      default: return 'warning';
    }
  };

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-4 rounded border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Yeni Müşteri Ekle">
          <form onSubmit={handleAddCustomer} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Adı</label>
              <input type="text" required value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İletişim Bilgisi</label>
              <input type="text" value={customerForm.contactInfo} onChange={e => setCustomerForm({...customerForm, contactInfo: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50">
              Müşteri Ekle
            </button>
          </form>
        </Card>

        <Card title="Yeni Sipariş Gir">
          <form onSubmit={handleAddOrder} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
                <select required value={orderForm.customerId} onChange={e => setOrderForm({...orderForm, customerId: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Seçiniz...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün</label>
                <select required value={orderForm.itemId} onChange={e => setOrderForm({...orderForm, itemId: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Seçiniz...</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (Stok: {i.stock})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
                <input type="number" min="1" required value={orderForm.quantity} onChange={e => setOrderForm({...orderForm, quantity: Number(e.target.value)})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teslim Tarihi</label>
                <input type="date" required value={orderForm.targetDeliveryDate} onChange={e => setOrderForm({...orderForm, targetDeliveryDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50">
              Sipariş Oluştur
            </button>
          </form>
        </Card>
      </div>

      <Card title="Açık ve Geçmiş Siparişler">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold text-gray-500">Müşteri</th>
                <th className="px-6 py-3 font-semibold text-gray-500">Ürün</th>
                <th className="px-6 py-3 font-semibold text-gray-500">Miktar</th>
                <th className="px-6 py-3 font-semibold text-gray-500">Durum</th>
                <th className="px-6 py-3 font-semibold text-gray-500">Teslim Tarihi</th>
                <th className="px-6 py-3 font-semibold text-gray-500">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {initialOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-800">{order.customer_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{order.item_name}</td>
                  <td className="px-6 py-4 font-medium text-sm text-gray-800">{order.quantity}</td>
                  <td className="px-6 py-4 text-sm">
                    <Badge variant={getStatusVariant(order.status as string) as "default" | "info" | "success" | "warning"}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.target_delivery_date ? new Date(order.target_delivery_date).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(order.created_at).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
              {initialOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-gray-400 italic text-center text-sm">Kayıt bulunamadı.</td>
                </tr>
              )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
