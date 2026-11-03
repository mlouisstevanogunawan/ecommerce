import Link from 'next/link';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import { getCategories, getMyStore } from '@/lib/supabase/data';
import { NewProductForm } from './NewProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  let categories, store;
  try {
    [categories, store] = await Promise.all([getCategories(), getMyStore()]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The catalog tables could not be read.';
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900">Add New Product</h1>
        <p className="mt-3 text-sm text-red-700">
          The product form cannot start because its categories could not be loaded: {message}
        </p>
      </div>
    );
  }

  const options = categories.flatMap((c) => [
    { id: c.id, label: c.name },
    ...(c.children ?? []).map((sub) => ({ id: sub.id, label: `— ${sub.name}` })),
  ]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/seller/products"
            className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add New Product</h1>
            <p className="text-xs text-gray-500">
              Create a new physical or digital product listing for your store.
            </p>
          </div>
        </div>
        <PlusCircle className="w-5 h-5 text-brand shrink-0" />
      </div>

      <NewProductForm categories={options} hasStore={Boolean(store)} storeTitle={store?.title ?? null} />
    </div>
  );
}
