import { Images } from 'lucide-react';
import { getAllBanners, getCategories } from '@/lib/supabase/data';
import { AdminBannersManager } from './AdminBannersManager';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  try {
    const [banners, categories] = await Promise.all([getAllBanners(), getCategories()]);
    return <AdminBannersManager banners={banners} categories={categories} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The banners table could not be read.';
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Images className="w-5 h-5 text-brand" />
          <span>Homepage Banners</span>
        </h1>
        <p className="mt-3 text-sm text-red-700">Banners are unavailable: {message}</p>
      </div>
    );
  }
}
