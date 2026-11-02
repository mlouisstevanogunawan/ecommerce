'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Product, Category } from '@/lib/types';
import { ProductCard } from '@/components/products/ProductCard';
import { useTranslation } from '@/components/i18n/I18nProvider';

interface CategoryShowcaseProps {
  category: Category;
  products: Product[];
  bannerImage?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
}

export function CategoryShowcase({
  category,
  products,
  bannerImage = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
  bannerTitle = "Women's & Men's Latest Trends",
  bannerSubtitle = 'Explore our hand-selected apparel collection for every season',
}: CategoryShowcaseProps) {
  const { t } = useTranslation();
  const categoryProducts = products.filter(
    (p) => p.category?.slug.includes(category.slug) || p.category_id === category.id
  ).slice(0, 8);

  if (categoryProducts.length === 0) return null;

  return (
    <section className="py-10 bg-white">
      <div className="modesy-container">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-3 mb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {category.name}
            </h3>
            {category.children && category.children.length > 0 && (
              <div className="hidden md:flex items-center gap-3 text-xs text-gray-500">
                {category.children.slice(0, 3).map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/categories/${sub.slug}`}
                    className="hover:text-brand transition-colors"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            href={`/categories/${category.slug}`}
            className="flex items-center gap-1.5 text-sm font-bold text-brand hover:text-brand-dark transition-colors"
          >
            <span>{t('common.viewAll')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Content with Banner + Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Feature Banner */}
          <div className="relative rounded-lg overflow-hidden group h-64 lg:h-auto min-h-[300px]">
            <img
              src={bannerImage}
              alt={bannerTitle}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">
                Featured Collection
              </span>
              <h4 className="text-xl font-bold mb-2 leading-snug">{bannerTitle}</h4>
              <p className="text-xs text-gray-200 mb-4 line-clamp-2">{bannerSubtitle}</p>
              <div>
                <Link
                  href={`/categories/${category.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition transform group-hover:translate-x-1"
                >
                  {t('home.shopNow')} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Product Grid (3 cols on large) */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {categoryProducts.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
