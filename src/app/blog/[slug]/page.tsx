import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Calendar, User, ArrowLeft, Share2, Tag } from 'lucide-react';
import { getBlogPostBySlug, getBlogPosts } from '@/lib/supabase/data';
import { formatDate } from '@/lib/utils';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export default async function BlogPostDetailPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const allPosts = await getBlogPosts();
  const relatedPosts = allPosts.filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link href="/blog" className="hover:text-brand transition">Blog</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold truncate">{post.title}</span>
        </nav>

        <article className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
          {/* Cover Image */}
          {post.image_url && (
            <div className="relative aspect-16/9 w-full bg-gray-900 overflow-hidden">
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 sm:p-10 space-y-6">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pb-4 border-b border-gray-100">
              <span className="bg-teal-50 text-brand font-bold px-2.5 py-1 rounded">
                {post.category?.name || 'Trends'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(post.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Modesy Editorial
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              {post.title}
            </h1>

            {/* Content */}
            <div className="text-sm sm:text-base text-gray-700 leading-relaxed space-y-4 pt-2 border-t border-gray-100">
              {post.content.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* Footer Back */}
            <div className="pt-8 border-t border-gray-200 flex items-center justify-between">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-brand transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Blog Articles</span>
              </Link>
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((p) => (
                <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-xs">
                  <h4 className="font-bold text-xs text-gray-900 hover:text-brand transition line-clamp-2 mb-1">
                    <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                  </h4>
                  <span className="text-[11px] text-gray-400">{formatDate(p.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
