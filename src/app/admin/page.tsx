import pool from "@/lib/db";
import AdminPanelClient from "@/components/AdminPanelClient";
import MainLayout from "@/components/layout/MainLayout";

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

export default async function AdminPage() {
  let items: Item[] = [];
  let dbError = null;

  try {
    const itemsResult = await pool.query(
      "SELECT * FROM items ORDER BY created_at DESC"
    );
    items = itemsResult.rows;
  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error);
    dbError = "Veritabanı bağlantı hatası oluştu.";
  }

  return (
    <MainLayout title="Mini MRP Admin Paneli">
      {dbError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
          {dbError}
        </div>
      ) : (
        <AdminPanelClient items={items} />
      )}
    </MainLayout>
  );
}
