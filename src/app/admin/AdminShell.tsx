'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  Layers,
  ShoppingBag,
  Users,
  ChevronRight,
  Images,
  Newspaper,
  Settings,
} from 'lucide-react';

const navigation = [
  { name: 'Platform Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Products Moderation', href: '/admin/products', icon: Package },
  { name: 'Categories Management', href: '/admin/categories', icon: Layers },
  { name: 'Homepage Banners', href: '/admin/banners', icon: Images },
  { name: 'Platform Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Blog', href: '/admin/blog', icon: Newspaper },
  { name: 'Users & Roles', href: '/admin/users', icon: Users },
  { name: 'Site Settings', href: '/admin/settings', icon: Settings },
];

export function AdminShell({ adminName, children }: { adminName: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="bg-slate-100 min-h-screen py-8">
      <div className="modesy-container">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-brand">Modesy</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">Admin Control Center</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              Signed in as {adminName}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar Menu (3 cols) */}
          <aside className="lg:col-span-3 bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-900 text-white rounded-lg mb-4">
              <div className="w-9 h-9 rounded bg-brand flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold truncate">Modesy Administration</h4>
                <span className="text-[10px] text-slate-400 block">System Root Level</span>
              </div>
            </div>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded text-xs font-bold transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-brand" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Right Main Content (9 cols) */}
          <main className="lg:col-span-9">{children}</main>
        </div>
      </div>
    </div>
  );
}
