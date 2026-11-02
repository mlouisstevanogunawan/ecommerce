'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingBag,
  Settings,
  Store,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface SellerShellProps {
  storeName: string | null;
  storeSlug: string | null;
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard Overview', href: '/seller/dashboard', icon: LayoutDashboard },
  { name: 'My Products', href: '/seller/products', icon: Package },
  { name: 'Add New Product', href: '/seller/products/new', icon: PlusCircle },
  { name: 'Store Orders', href: '/seller/orders', icon: ShoppingBag },
  { name: 'Store Settings', href: '/seller/store-settings', icon: Settings },
];

export function SellerShell({ storeName, storeSlug, children }: SellerShellProps) {
  const pathname = usePathname();

  return (
    <div className="bg-gray-100 min-h-screen py-8">
      <div className="modesy-container">
        {/* Top Breadcrumb & Status */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-brand">Modesy</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-gray-900 font-bold">Seller Central</span>
          </div>

          {storeSlug && (
            <div className="flex items-center gap-3">
              <Link
                href={`/profile/${storeSlug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
              >
                <span>View Live Store</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar Menu (3 cols) */}
          <aside className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-4 shadow-xs">
            <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-100 rounded-lg mb-4">
              <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                {storeName ? (
                  <>
                    <h4 className="text-xs font-bold text-gray-900 truncate">{storeName}</h4>
                    <span className="text-[11px] text-teal-800 font-semibold block">Your store</span>
                  </>
                ) : (
                  <>
                    <h4 className="text-xs font-bold text-gray-900 truncate">No store yet</h4>
                    <Link href="/seller/store-settings" className="text-[11px] text-brand font-bold hover:underline block">
                      Open your store
                    </Link>
                  </>
                )}
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
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
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
