import Link from 'next/link';
import { ChevronRight, Calendar, ArrowRight } from 'lucide-react';
import { getBlogPosts } from '@/lib/supabase/data';
import { formatDate, readingMinutes } from '@/lib/utils';

export const revalidate = 60;

export default async function BlogIndexPage() {
  const posts = await getBlogPosts();

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">Blog</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8 shadow-xs text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-brand mb-1 block">
            Marketplace Magazine
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            Insights &amp; Stories
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Seller spotlights, buying guides and product stories from the marketplace.
          </p>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col group"
            >
              <Link href={`/blog/${post.slug}`} className="relative h-52 overflow-hidden block">
                <img
                  src={post.image_url || '/placeholder-product.svg'}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-brand text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-xs">
                  {post.category?.name}
                </div>
              </Link>

              <div className="p-6 flex flex-col flex-grow justify-between">
                <div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(post.created_at)}
                    </span>
                  </div>

                  <h2 className="font-bold text-base text-gray-900 group-hover:text-brand transition-colors line-clamp-2 leading-snug mb-2">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>

                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                    {post.excerpt || post.content.substring(0, 140)}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                  >
                    Read Article <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <span className="text-xs text-gray-400">{readingMinutes(post.content)} min read</span>
                </div>
              </div>
            </article>
          ))}
        </div>
        {posts.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h2 className="font-bold text-gray-800 text-base mb-1">No articles published yet</h2>
            <p className="text-xs text-gray-500">New posts appear here once they are published in the admin panel.</p>
          </div>
        )}
      </div>
    </div>
  );
}
