import { Package } from 'lucide-react';
import { getAllProducts } from '@/lib/supabase/data';
import { AdminProductsTable } from './AdminProductsTable';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  try {
    const products = await getAllProducts();
    return <AdminProductsTable products={products} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The products table could not be read.';
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-brand" />
          <span>Product Catalog Moderation</span>
        </h1>
        <p className="mt-3 text-sm text-red-700">
          The catalog is unavailable: {message}
        </p>
      </div>
    );
  }
}
