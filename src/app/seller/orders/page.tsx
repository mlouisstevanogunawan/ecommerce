import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { getSellerOrders } from '@/lib/supabase/data';
import { SellerOrdersTable } from './SellerOrdersTable';

export const dynamic = 'force-dynamic';

export default async function SellerOrdersPage() {
  try {
    const orders = await getSellerOrders();
    return <SellerOrdersTable orders={orders} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The orders table could not be read.';
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-brand" />
          <span>Store Customer Orders</span>
        </h1>
        <p className="mt-3 text-sm text-red-700">Orders are unavailable: {message}</p>
      </div>
    );
  }
}
