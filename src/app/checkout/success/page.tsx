import React from 'react';
import Link from 'next/link';
import { FileText, AlertCircle } from 'lucide-react';
import { getOrderById } from '@/lib/supabase/data';
import { Order } from '@/lib/types';
import { SuccessView } from './SuccessView';

export const dynamic = 'force-dynamic';

interface SuccessPageProps {
  searchParams: Promise<{ order_number?: string; orders?: string }>;
}

function Problem({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-gray-50 min-h-[75vh] py-16 flex items-center justify-center">
      <div className="modesy-container max-w-md">
        <div className="bg-white rounded-xl border border-rose-200 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-rose-700 mb-2">{title}</h1>
          <p className="text-xs text-gray-600 mb-6">{message}</p>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-md text-xs font-bold transition"
          >
            <FileText className="w-4 h-4" />
            <span>My Orders</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function OrderSuccessPage({ searchParams }: SuccessPageProps) {
  const query = await searchParams;
  const numbers = (query.orders ?? query.order_number ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (numbers.length === 0) {
    return (
      <Problem
        title="No order reference"
        message="This confirmation page needs an order number. Check your order history instead."
      />
    );
  }

  // Every number is re-read from the database so the confirmation shows what was
  // actually stored for the signed-in buyer, not what the redirect query claimed.
  let orders: Order[];
  try {
    const loaded = await Promise.all(numbers.map((number) => getOrderById(number)));
    orders = loaded.filter((order): order is Order => Boolean(order));
  } catch (error) {
    return (
      <Problem
        title="Order confirmation unavailable"
        message={error instanceof Error ? error.message : 'The order could not be read from the database.'}
      />
    );
  }

  if (orders.length === 0) {
    return (
      <Problem
        title="Order not found"
        message={`No order belonging to your account matches ${numbers.join(', ')}.`}
      />
    );
  }

  return <SuccessView orders={orders} />;
}
