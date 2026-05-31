import pool from "@/lib/db";
import MainLayout from "@/components/layout/MainLayout";
import SalesClient, { SalesOrder, Customer, Item } from "./SalesClient";
import { getSalesOrders, getCustomers } from "@/lib/services/sales.service";

export const dynamic = 'force-dynamic';

export default async function SatisPage() {
  let orders: SalesOrder[] = [];
  let customers: Customer[] = [];
  let items: Item[] = [];
  let dbError = null;

  try {
    orders = await getSalesOrders();
    customers = await getCustomers();
    
    // Yalnızca son_urun olanları getir
    const itemsResult = await pool.query(
      "SELECT id, name, stock FROM items WHERE type = 'son_urun' ORDER BY name ASC"
    );
    items = itemsResult.rows;
  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error);
    dbError = "Veritabanı bağlantı hatası oluştu.";
  }

  return (
    <MainLayout title="Satış ve Talep Yönetimi">
      {dbError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
          {dbError}
        </div>
      ) : (
        <SalesClient initialOrders={orders} customers={customers} items={items} />
      )}
    </MainLayout>
  );
}
