import pool from "@/lib/db";
import Link from "next/link";

interface Item {
  id: string;
  name: string;
  type: string;
  stock: number;
  min_stock: number;
  created_at: string;
}



export default async function StokPage() {
  let items: Item[] = [];

  let dbError = null;

  try {
    const result = await pool.query("SELECT * FROM items ORDER BY created_at DESC");
    items = result.rows;


  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error);
    dbError = "Veritabanı bağlantı hatası oluştu.";
  }

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-sm text-gray-800">
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="h-14 flex items-center px-6 bg-slate-950 border-b border-slate-800">
          <span className="font-bold tracking-widest text-lg">MRP SİSTEMİ</span>
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <li><Link href="/" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">Dashboard</Link></li>
            <li><Link href="/admin" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">Admin Paneli</Link></li>
            <li><Link href="/stok" className="block px-6 py-2.5 bg-blue-600 text-white">Stok Yönetimi</Link></li>
            <li><Link href="/stok-hareketleri" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">Stok Hareketleri</Link></li>
            <li><Link href="/satinalma" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">Satın Alma</Link></li>
            <li><Link href="/uretim" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">Üretim Modülü</Link></li>
            <li><Link href="/kalite" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">Kalite Kontrol</Link></li>
            <li><Link href="#" className="block px-6 py-2.5 hover:bg-slate-800 text-slate-300">Sistem Ayarları</Link></li>
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h2 className="font-semibold text-gray-700 text-base">Stok Yönetimi</h2>
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 font-medium">Hoş geldiniz, Admin</span>
            <button className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium border border-blue-200 px-4 py-1.5 rounded transition-colors">
              Çıkış
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {dbError ? (
            <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200 shadow-sm font-medium">
              {dbError}
            </div>
          ) : (
            <div className="bg-white border border-gray-300 rounded flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-600 uppercase text-xs">Stok Listesi</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 uppercase">
                      <th className="px-4 py-2 font-semibold border-r border-gray-200">ID</th>
                      <th className="px-4 py-2 font-semibold border-r border-gray-200">Ürün Adı</th>
                      <th className="px-4 py-2 font-semibold border-r border-gray-200">Tip</th>
                      <th className="px-4 py-2 font-semibold border-r border-gray-200">Stok</th>
                      <th className="px-4 py-2 font-semibold border-r border-gray-200">Min Stok</th>
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
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.stock < item.min_stock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item.stock}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-r border-gray-200">{item.min_stock}</td>
                        <td className="px-4 py-2">{new Date(item.created_at).toLocaleString('tr-TR')}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-gray-400 italic text-center">Kayıt bulunamadı.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


        </main>
      </div>
    </div>
  );
}
