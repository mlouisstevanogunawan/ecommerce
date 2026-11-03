'use client';

import { useState } from 'react';
import { ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react';
import { Order, OrderStatus } from '@/lib/types';
import { Price } from '@/components/currency/Price';
import { formatDate } from '@/lib/utils';

const STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

type Notice = { kind: 'ok' | 'err'; text: string } | null;

export function SellerOrdersTable({ orders: initial }: { orders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initial);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeStatus(orderId: string, status: OrderStatus) {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    setBusyId(orderId);
    try {
      const res = await fetch('/api/seller/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setNotice({ kind: 'ok', text: `${json.order?.order_number ?? 'Order'} saved as "${status}".` });
    } catch (err: unknown) {
      setOrders(previous);
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The status was not saved.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand" />
            <span>Store Customer Orders ({orders.length})</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Fulfill and update dispatch tracking for customer orders.
          </p>
        </div>
      </div>

      {notice && (
        <div
          className={`mx-6 mt-6 p-3 rounded text-xs font-semibold flex items-center gap-2 border ${
            notice.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notice.kind === 'ok' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-6">Order #</th>
              <th className="py-3.5 px-6">Customer</th>
              <th className="py-3.5 px-6">Placed</th>
              <th className="py-3.5 px-6">Destination</th>
              <th className="py-3.5 px-6">Amount</th>
              <th className="py-3.5 px-6">Current Status</th>
              <th className="py-3.5 px-6 text-right">Update Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((ord) => (
              <tr key={ord.id} className="hover:bg-gray-50/80 transition">
                <td className="py-4 px-6 font-mono font-bold text-gray-900">
                  {ord.order_number}
                </td>
                <td className="py-4 px-6">
                  <div className="font-bold text-gray-900">{ord.customer_name}</div>
                  <span className="text-[11px] text-gray-500">{ord.customer_email}</span>
                </td>
                <td className="py-4 px-6 text-gray-500">{formatDate(ord.created_at)}</td>
                <td className="py-4 px-6 text-gray-600">
                  {ord.shipping_address?.city}, {ord.shipping_address?.country}
                </td>
                <td className="py-4 px-6 font-bold text-gray-900">
                  <Price amount={ord.total} />
                  <span className="block text-[10px] font-semibold text-emerald-700 capitalize">
                    {ord.payment_status}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold capitalize ${
                      ord.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : ord.status === 'shipped'
                        ? 'bg-purple-50 text-purple-700'
                        : ord.status === 'cancelled'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {ord.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <select
                    value={ord.status}
                    disabled={busyId === ord.id}
                    onChange={(e) => changeStatus(ord.id, e.target.value as OrderStatus)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 bg-white focus:outline-none focus:border-brand font-medium disabled:opacity-50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 px-6 text-gray-500">
                  No orders have been placed for your store yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
