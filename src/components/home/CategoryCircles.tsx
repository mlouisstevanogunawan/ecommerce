'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Category } from '@/lib/types';
import { useTranslation } from '@/components/i18n/I18nProvider';

interface CategoryCirclesProps {
  categories: Category[];
}

export function CategoryCircles({ categories }: CategoryCirclesProps) {
  const { t } = useTranslation();
  // Show first 12 category items (parent or sub)
  const displayCategories = categories.slice(0, 12);

  return (
    <section className="py-10 bg-white">
      <div className="modesy-container">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            {t('home.shopByCategory')}
          </h3>
          <Link
            href="/products"
            className="flex items-center gap-1.5 text-sm font-bold text-brand hover:text-brand-dark transition-colors"
          >
            <span>{t('common.viewAll')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Circles Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6 lg:gap-8">
          {displayCategories.map((cat) => (
            <div key={cat.id} className="item-category-round group">
              <Link href={`/categories/${cat.slug}`} className="block">
                <div className="image-wrapper">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} loading="lazy" />
                  ) : (
                    // No stock photo: the circle shows the category's own name,
                    // which is the only real data available for it.
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 font-bold text-lg uppercase">
                      {cat.name.slice(0, 2)}
                    </div>
                  )}
                  <div className="overlay-text">
                    <span className="flex items-center gap-1">
                      {t('home.shopNow')} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
                <div className="font-semibold text-sm text-gray-800 group-hover:text-brand transition-colors line-clamp-1">
                  {cat.name}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
