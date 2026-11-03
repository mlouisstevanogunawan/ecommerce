import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Package, Truck, ArrowLeft } from 'lucide-react';
import { getOrderById } from '@/lib/supabase/data';
import { formatDate } from '@/lib/utils';
import { Price } from '@/components/currency/Price';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link href="/account/orders" className="hover:text-brand transition">Orders</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">{order.order_number}</span>
        </nav>

        <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50/50">
            <div>
              <span className="text-xs font-bold text-brand uppercase tracking-wider">
                Order Invoice
              </span>
              <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 mt-0.5">
                <span>Order #{order.order_number}</span>
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded bg-blue-100 text-blue-800 capitalize">
                Status: {order.status}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Shipping & Payment Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-lg bg-gray-50 border border-gray-200 text-xs">
              <div>
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-brand" />
                  <span>Shipping Address</span>
                </h4>
                <p className="font-bold text-gray-800">{order.customer_name}</p>
                <p className="text-gray-600">{order.shipping_address?.address_line1}</p>
                <p className="text-gray-600">
                  {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}
                </p>
                <p className="text-gray-600">{order.customer_email}</p>
                <p className="text-gray-600">{order.customer_phone}</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-brand" />
                  <span>Payment Details</span>
                </h4>
                <p className="text-gray-600">
                  Method: <strong className="text-gray-900 capitalize">{order.payment_method.replace('_', ' ')}</strong>
                </p>
                <p className="text-gray-600">
                  Payment Status: <strong className="text-emerald-700 capitalize">{order.payment_status}</strong>
                </p>
                {order.coupon_code && (
                  <p className="text-gray-600">
                    Coupon Code: <strong className="text-brand">{order.coupon_code}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="font-bold text-sm text-gray-900 mb-3">Order Items</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">Item</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Price</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 flex items-center gap-3">
                          {item.product_image && (
                            <img
                              src={item.product_image}
                              alt={item.product_title}
                              className="w-10 h-12 object-cover rounded border border-gray-200"
                            />
                          )}
                          <div>
                            <span className="font-bold text-gray-900 block">{item.product_title}</span>
                            {item.variant_name && (
                              <span className="text-[11px] text-gray-500">Variant: {item.variant_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-gray-700">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-gray-700"><Price amount={item.price} /></td>
                        <td className="py-3 px-4 text-right font-bold text-brand"><Price amount={item.total_price} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Breakdown */}
            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <Price amount={order.subtotal} className="font-semibold text-gray-800" />
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-teal-700">
                    <span>Discount:</span>
                    <span className="font-semibold">-<Price amount={order.discount} /></span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping:</span>
                  <span className="font-semibold text-gray-800">
                    {order.shipping_fee === 0 ? 'Free' : <Price amount={order.shipping_fee} />}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-extrabold text-gray-900">
                  <span>Total:</span>
                  <Price amount={order.total} className="text-brand text-base" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Back Button */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-brand"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Orders</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
