import { Layers } from 'lucide-react';
import { getCategories } from '@/lib/supabase/data';
import { AdminCategoriesManager } from './AdminCategoriesManager';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  try {
    const categories = await getCategories();
    return <AdminCategoriesManager categories={categories} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The categories table could not be read.';
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand" />
          <span>Category Taxonomy Management</span>
        </h1>
        <p className="mt-3 text-sm text-red-700">Categories are unavailable: {message}</p>
      </div>
    );
  }
}
