'use client';

import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import { BlogPost } from '@/lib/types';
import { formatDate, readingMinutes } from '@/lib/utils';

interface LatestBlogSectionProps {
  posts: BlogPost[];
}

export function LatestBlogSection({ posts }: LatestBlogSectionProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50 border-t border-gray-200">
      <div className="modesy-container">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 mb-8 border-b border-gray-200">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Latest from Our Blog
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">Guides, trends, and stories from our creative community</p>
          </div>
          <Link
            href="/blog"
            className="flex items-center gap-1.5 text-sm font-bold text-brand hover:text-brand-dark transition-colors"
          >
            <span>View All Posts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3-Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.slice(0, 3).map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col group"
            >
              <Link href={`/blog/${post.slug}`} className="relative h-48 overflow-hidden block">
                <img
                  src={post.image_url || '/placeholder-product.svg'}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 bg-brand text-white text-[11px] font-bold px-2.5 py-1 rounded">
                  {post.category?.name}
                </div>
              </Link>

              <div className="p-5 flex flex-col flex-grow justify-between">
                <div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-gray-900 group-hover:text-brand transition-colors line-clamp-2 leading-snug">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h4>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                    {post.excerpt || post.content.substring(0, 120)}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                  >
                    Read More <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <span className="text-xs text-gray-400">{readingMinutes(post.content)} min read</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
