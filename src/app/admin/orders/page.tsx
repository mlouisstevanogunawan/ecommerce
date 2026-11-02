import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Eye } from 'lucide-react';
import { getAllOrders } from '@/lib/supabase/data';
import { formatDate } from '@/lib/utils';
import { Price } from '@/components/currency/Price';
import type { Order } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  let orders: Order[];
  try {
    orders = await getAllOrders();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The orders table could not be read.';
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 text-sm text-red-700">
        Platform orders are unavailable: {message}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-brand" />
          <span>Platform Global Orders ({orders.length})</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Inspect, audit, and resolve customer orders placed across all registered multi-vendor shops.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-6">Order ID</th>
              <th className="py-3.5 px-6">Customer & Email</th>
              <th className="py-3.5 px-6">Date</th>
              <th className="py-3.5 px-6">Total Amount</th>
              <th className="py-3.5 px-6">Payment</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">View Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((ord) => (
              <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                <td className="py-4 px-6 font-mono font-bold text-slate-900">
                  {ord.order_number}
                </td>
                <td className="py-4 px-6">
                  <div className="font-bold text-slate-900">{ord.customer_name}</div>
                  <span className="text-[11px] text-slate-400">{ord.customer_email}</span>
                </td>
                <td className="py-4 px-6 text-slate-500">{formatDate(ord.created_at)}</td>
                <td className="py-4 px-6 font-bold text-brand"><Price amount={ord.total} /></td>
                <td className="py-4 px-6">
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded capitalize">
                    {ord.payment_method.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 capitalize">
                    {ord.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <Link
                    href={`/account/orders/${ord.order_number}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:text-brand hover:border-brand transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Invoice</span>
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 px-6 text-slate-500">
                  No orders have been placed on the platform yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
