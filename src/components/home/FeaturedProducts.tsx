'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/products/ProductCard';
import { useTranslation } from '@/components/i18n/I18nProvider';

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Tabs come from the categories actually present in this list, so a tab can
  // never advertise a section the database does not have.
  const tabs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) {
      if (p.category?.slug && !seen.has(p.category.slug)) seen.set(p.category.slug, p.category.name);
    }
    return [...seen].map(([slug, name]) => ({ slug, name }));
  }, [products]);

  const filteredProducts = activeSlug
    ? products.filter((p) => p.category?.slug === activeSlug)
    : products;

  const displayed = filteredProducts.slice(0, visibleCount);

  return (
    <section className="py-10 bg-white">
      <div className="modesy-container">
        {/* Section Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-6 border-b border-gray-200 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-brand">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {t('home.featuredProducts')}
              </h3>
              <p className="text-xs text-gray-500">{t('home.featuredSubtitle')}</p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" role="group" aria-label={t('home.featuredProducts')}>
            <button
              type="button"
              aria-pressed={activeSlug === null}
              onClick={() => { setActiveSlug(null); setVisibleCount(8); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeSlug === null
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('common.all')}
            </button>
            {tabs.map((tab) => (
              <button
                key={tab.slug}
                type="button"
                aria-pressed={activeSlug === tab.slug}
                onClick={() => { setActiveSlug(tab.slug); setVisibleCount(8); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeSlug === tab.slug
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {displayed.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            No featured listing in this category yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayed.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {visibleCount < filteredProducts.length && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 4)}
              className="px-6 py-2.5 border-2 border-brand text-brand hover:bg-brand hover:text-white rounded-md text-sm font-bold transition-all duration-200"
            >
              {t('common.viewAll')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
