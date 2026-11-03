'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Category } from '@/lib/types';
import { useTranslation } from '@/components/i18n/I18nProvider';

interface MegaMenuProps {
  categories: Category[];
}

export function MegaMenu({ categories }: MegaMenuProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  return (
    <nav className="bg-white border-b border-gray-200 hidden lg:block relative z-30">
      <div className="modesy-container">
        <ul className="flex items-center space-x-1 font-semibold text-sm text-gray-800">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="relative py-3 px-3 hover:text-brand cursor-pointer transition-colors"
              onMouseEnter={() => setActiveCategory(cat)}
              onMouseLeave={() => setActiveCategory(null)}
            >
              <Link href={`/categories/${cat.slug}`} className="flex items-center gap-1">
                <span>{cat.name}</span>
              </Link>

              {/* Mega Dropdown */}
              {activeCategory?.id === cat.id && cat.children && cat.children.length > 0 && (
                <div
                  className="absolute top-full left-0 w-[880px] bg-white border border-gray-200 shadow-xl rounded-b-lg p-6 flex gap-8 z-40 animate-fadeIn"
                  onMouseEnter={() => setActiveCategory(cat)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  {/* Subcategories columns */}
                  <div className="flex-1 grid grid-cols-3 gap-6">
                    {cat.children.map((sub) => (
                      <div key={sub.id} className="space-y-2">
                        <Link
                          href={`/categories/${sub.slug}`}
                          className="font-bold text-gray-900 text-sm hover:text-brand flex items-center justify-between group"
                        >
                          <span>{sub.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-brand transition-opacity" />
                        </Link>
                        {/* Sub links under subcategory if any or fallback quick links */}
                        <ul className="space-y-1.5 text-xs text-gray-500">
                          <li>
                            <Link href={`/categories/${sub.slug}`} className="hover:text-brand transition-colors">
                              {t('common.all')} {sub.name}
                            </Link>
                          </li>
                          <li>
                            <Link href={`/categories/${sub.slug}?sort=popular`} className="hover:text-brand transition-colors">
                              {t('categories.popularProducts')}
                            </Link>
                          </li>
                          <li>
                            <Link href={`/categories/${sub.slug}?sort=discount`} className="hover:text-brand transition-colors">
                              {t('categories.specialDeals')}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Category Image Preview Cards (Matching Modesy col-4 col-category-images) */}
                  <div className="w-64 border-l border-gray-100 pl-6 flex flex-col gap-4 justify-center">
                    <div className="space-y-3">
                      {cat.children.slice(0, 2).map((subItem) => (
                        <Link
                          key={subItem.id}
                          href={`/categories/${subItem.slug}`}
                          className="group block"
                        >
                          <div className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                            <img
                              src={subItem.image_url || cat.image_url || '/placeholder-product.svg'}
                              alt={subItem.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                              <span className="text-xs font-bold text-white drop-shadow flex items-center gap-1 group-hover:underline">
                                {subItem.name}
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
