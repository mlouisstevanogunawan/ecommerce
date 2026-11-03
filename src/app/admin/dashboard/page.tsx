import Link from 'next/link';
import {
  DollarSign,
  Package,
  ShoppingBag,
  Users,
  Store,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { getAdminStats, getAllProducts, getAllOrders } from '@/lib/supabase/data';
import { Price } from '@/components/currency/Price';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  let stats: Awaited<ReturnType<typeof getAdminStats>>;
  let products: Awaited<ReturnType<typeof getAllProducts>>;
  let orders: Awaited<ReturnType<typeof getAllOrders>>;
  try {
    [stats, products, orders] = await Promise.all([getAdminStats(), getAllProducts(), getAllOrders()]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The platform tables could not be read.';
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 text-sm text-red-700">
        Platform metrics are unavailable: {message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Platform Overview & Metrics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Global snapshot of revenue, volume, vendor listings, and moderation activity.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Gross Volume</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900"><Price amount={stats.totalRevenue} /></div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> Live Platform Sales
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Orders</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalOrders}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Executed atomically</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Products</span>
            <div className="w-8 h-8 rounded-full bg-teal-50 text-brand flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalProducts}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Published across vendors</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Stores & Users</span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalStores} Stores / {stats.totalUsers} Users</div>
          <span className="text-[11px] text-purple-600 font-semibold mt-1 block">Active multi-vendor network</span>
        </div>
      </div>

      {/* Quick Moderation Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Products Pending/Active */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Recent Products
            </h3>
            <Link href="/admin/products" className="text-xs font-bold text-brand hover:underline">
              Moderate All
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {products.slice(0, 5).map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {p.images?.[0]?.image_url ? (
                    <img
                      src={p.images[0].image_url}
                      alt={p.title}
                      className="w-9 h-11 object-cover rounded border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-11 rounded border border-slate-200 bg-slate-50 shrink-0" />
                  )}
                  <div>
                    <h5 className="font-bold text-slate-900 line-clamp-1">{p.title}</h5>
                    <span className="text-[11px] text-slate-400">
                      Store: {p.store?.title ?? 'Unknown store'}
                    </span>
                  </div>
                </div>
                <Price amount={p.discounted_price} className="font-bold text-brand" />
              </div>
            ))}
            {products.length === 0 && (
              <p className="p-4 text-slate-500">No products have been listed yet.</p>
            )}
          </div>
        </div>

        {/* Latest Orders */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Platform Orders
            </h3>
            <Link href="/admin/orders" className="text-xs font-bold text-brand hover:underline">
              Inspect All
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="p-3.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono font-bold text-slate-900 block">{o.order_number}</span>
                  <span className="text-[11px] text-slate-400">Customer: {o.customer_name}</span>
                </div>
                <div className="text-right">
                  <Price amount={o.total} className="font-bold text-brand block" />
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold capitalize">
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="p-4 text-slate-500">No orders have been placed yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
