'use client';

import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'all' | 'clothing' | 'shoes' | 'jewelry'>('all');

  const filteredProducts = products.filter((p) => {
    if (activeTab === 'clothing') return p.category?.slug.includes('clothing');
    if (activeTab === 'shoes') return p.category?.slug.includes('shoes');
    if (activeTab === 'jewelry') return p.category?.slug.includes('jewelry');
    return true;
  });

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
              <p className="text-xs text-gray-500">Hand-picked top verified quality products</p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => { setActiveTab('all'); setVisibleCount(8); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('common.all')}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('clothing'); setVisibleCount(8); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'clothing'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('categories.clothing')}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('shoes'); setVisibleCount(8); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'shoes'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('categories.shoes')}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('jewelry'); setVisibleCount(8); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'jewelry'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('categories.accessories')}
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayed.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

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
