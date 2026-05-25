import pool from "@/lib/db";
import AdminPanelClient from "@/components/AdminPanelClient";
import Link from "next/link";

interface Item {
  id: string;
  name: string;
  type: string;
  stock: number;
  min_stock: number;
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
    <div className="flex min-h-screen bg-gray-100 font-sans text-sm text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="h-14 flex items-center px-6 bg-slate-950 border-b border-slate-800">
          <span className="font-bold tracking-widest text-lg">MRP SİSTEMİ</span>
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <li>
              <Link href="/" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin" className="block px-6 py-2.5 bg-blue-600 text-white">
                Admin Paneli
              </Link>
            </li>
            <li>
              <Link href="/stok" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">
                Stok Yönetimi
              </Link>
            </li>
            <li>
              <Link href="/satinalma" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">
                Satınalma
              </Link>
            </li>
            <li>
              <Link href="/uretim" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">
                Üretim Modülü
              </Link>
            </li>
            <li>
              <Link href="/kalite" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">
                Kalite Kontrol
              </Link>
            </li>
            <li>
              <Link href="#" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">
                Sistem Ayarları
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h2 className="font-semibold text-gray-700 text-base">
            Mini MRP Admin Paneli
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 font-medium">Hoş geldiniz, Admin</span>
            <button className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium border border-blue-200 px-4 py-1.5 rounded transition-colors">
              Çıkış
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          {dbError ? (
            <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
              {dbError}
            </div>
          ) : (
            <AdminPanelClient items={items} />
          )}
        </main>
      </div>
    </div>
  );
}
