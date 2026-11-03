import { Newspaper } from 'lucide-react';
import { getAdminBlogPosts, getBlogCategories } from '@/lib/supabase/data';
import { AdminBlogManager } from './AdminBlogManager';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  try {
    const [posts, categories] = await Promise.all([getAdminBlogPosts(), getBlogCategories()]);
    return <AdminBlogManager posts={posts} categories={categories} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The blog tables could not be read.';
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-brand" />
          <span>Blog Management</span>
        </h1>
        <p className="mt-3 text-sm text-red-700">The blog could not be loaded: {message}</p>
      </div>
    );
  }
}
