import Link from 'next/link';
import { Package, ChevronRight, Eye } from 'lucide-react';
import { getOrders } from '@/lib/supabase/data';
import { formatDate } from '@/lib/utils';
import { Price } from '@/components/currency/Price';

export const revalidate = 0; // dynamic

export default async function AccountOrdersPage() {
  const orders = await getOrders();

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">My Orders</span>
        </nav>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand" />
                <span>My Order History</span>
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                View all your past and active orders placed on Modesy.
              </p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-base text-gray-800 mb-1">No orders found</h3>
              <p className="text-xs text-gray-500 mb-6">You have not placed any orders yet.</p>
              <Link
                href="/products"
                className="px-5 py-2 bg-brand text-white text-xs font-bold rounded hover:bg-brand-dark transition"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-6">Order #</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Total</th>
                    <th className="py-3 px-6">Payment</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-4 px-6 font-mono font-bold text-gray-900">
                        {ord.order_number}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {formatDate(ord.created_at)}
                      </td>
                      <td className="py-4 px-6 font-bold text-brand">
                        <Price amount={ord.total} />
                      </td>
                      <td className="py-4 px-6 capitalize">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {ord.payment_status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded capitalize">
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/account/orders/${ord.order_number}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:text-brand hover:border-brand transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
