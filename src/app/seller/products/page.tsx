import Link from 'next/link';
import { Package, PlusCircle } from 'lucide-react';
import { getSellerProducts } from '@/lib/supabase/data';
import { SellerProductsTable } from './SellerProductsTable';

export const dynamic = 'force-dynamic';

export default async function SellerProductsPage() {
  try {
    const products = await getSellerProducts();
    return <SellerProductsTable products={products} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The products table could not be read.';
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand" />
            <span>Store Products Catalog</span>
          </h1>
          <Link
            href="/seller/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
        <p className="mt-3 text-sm text-red-700">Your catalog could not be loaded: {message}</p>
      </div>
    );
  }
}
