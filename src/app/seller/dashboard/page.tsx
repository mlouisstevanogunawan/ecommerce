import React from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Package,
  ShoppingBag,
  Star,
  PlusCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { getSellerProducts, getSellerOrders, getMyStore } from '@/lib/supabase/data';
import { formatDate } from '@/lib/utils';
import { Price } from '@/components/currency/Price';

export const dynamic = 'force-dynamic';

export default async function SellerDashboardPage() {
  const [products, orders, store] = await Promise.all([
    getSellerProducts(),
    getSellerOrders(),
    getMyStore(),
  ]);

  const paidOrders = orders.filter((order) => order.payment_status === 'paid');
  const paidRevenue = paidOrders.reduce((acc, order) => acc + order.total, 0);
  const paidOrderCount = paidOrders.length;
  const openOrders = orders.filter((order) => order.status === 'pending' || order.status === 'processing').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Welcome back, {store?.title ?? 'Seller'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {store
              ? 'Here is your store performance overview and latest order activity.'
              : 'You have not opened a store yet. Create one in Store Settings before listing products.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/seller/store-settings"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
          >
            <span>{store ? 'Store Settings' : 'Open Your Store'}</span>
          </Link>
          <Link
            href="/seller/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Sales</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900"><Price amount={paidRevenue} /></div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> From {paidOrderCount} paid orders
          </span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Store Orders</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{orders.length}</div>
          <span className="text-[11px] text-gray-400 mt-1 block">{openOrders} awaiting processing</span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Live Products</span>
            <div className="w-8 h-8 rounded-full bg-teal-50 text-brand flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{products.length}</div>
          <span className="text-[11px] text-brand font-semibold mt-1 block">Active on catalog</span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Store Rating</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {(store?.reviews_count ?? 0) > 0 ? `${(store?.rating ?? 0).toFixed(2)} / 5.0` : 'No ratings yet'}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Based on {store?.reviews_count ?? 0} verified reviews
          </span>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900">Recent Customer Orders</h3>
          <Link
            href="/seller/orders"
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-5">Order #</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Amount</th>
                <th className="py-3 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((ord) => (
                <tr key={ord.id} className="hover:bg-gray-50/80 transition">
                  <td className="py-3.5 px-5 font-mono font-bold text-gray-900">{ord.order_number}</td>
                  <td className="py-3.5 px-5 text-gray-800 font-medium">{ord.customer_name}</td>
                  <td className="py-3.5 px-5 text-gray-500">{formatDate(ord.created_at)}</td>
                  <td className="py-3.5 px-5 font-bold text-brand"><Price amount={ord.total} /></td>
                  <td className="py-3.5 px-5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 capitalize">
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
