"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  const pathname = usePathname();

  const menuItems = [
    { href: "/", label: "Dashboard" },
    { href: "/admin", label: "Admin Paneli" },
    { href: "/stok", label: "Stok Yönetimi" },
    { href: "/satinalma", label: "Satın Alma" },
    { href: "/uretim", label: "Üretim Modülü" },
    { href: "/kalite", label: "Kalite Kontrol" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-sm text-gray-800">
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shrink-0">
        <div className="h-14 flex items-center px-6 bg-slate-950 border-b border-slate-800">
          <span className="font-bold tracking-widest text-lg">MRP SİSTEMİ</span>
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-6 py-2.5 ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h2 className="font-semibold text-gray-700 text-base">{title}</h2>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
