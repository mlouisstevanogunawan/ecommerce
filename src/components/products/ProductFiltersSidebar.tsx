'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Category } from '@/lib/types';
import { ChevronDown, ChevronRight, Filter, RotateCcw, Search } from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '@/components/currency/CurrencyProvider';
import { useTranslation } from '@/components/i18n/I18nProvider';

interface ProductFiltersSidebarProps {
  categories: Category[];
  currentCategorySlug?: string;
  brands: string[];
}

export function ProductFiltersSidebar({
  categories,
  currentCategorySlug,
  brands,
}: ProductFiltersSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { config, exchangeRate } = useCurrency();
  const { t } = useTranslation();

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    clothing: true,
    shoes: true,
  });

  const selectedBrand = searchParams.get('brand') || '';

  // Synchronize display price inputs with USD search parameters
  useEffect(() => {
    const usdMin = searchParams.get('minPrice');
    const usdMax = searchParams.get('maxPrice');
    const rate = exchangeRate || 1;

    if (usdMin) {
      const converted = Math.round(Number(usdMin) * rate);
      setMinPrice(String(converted));
    } else {
      setMinPrice('');
    }

    if (usdMax) {
      const converted = Math.round(Number(usdMax) * rate);
      setMaxPrice(String(converted));
    } else {
      setMaxPrice('');
    }
  }, [searchParams, exchangeRate]);

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const applyPriceFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const rate = exchangeRate || 1;

    if (minPrice && !isNaN(Number(minPrice))) {
      const usdMin = (Number(minPrice) / rate).toFixed(2);
      params.set('minPrice', usdMin);
    } else {
      params.delete('minPrice');
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      const usdMax = (Number(maxPrice) / rate).toFixed(2);
      params.set('maxPrice', usdMax);
    } else {
      params.delete('maxPrice');
    }

    router.push(`?${params.toString()}`);
  };

  const handleBrandSelect = (brand: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedBrand === brand) {
      params.delete('brand');
    } else {
      params.set('brand', brand);
    }
    router.push(`?${params.toString()}`);
  };

  const resetAllFilters = () => {
    router.push(currentCategorySlug ? `/categories/${currentCategorySlug}` : '/products');
  };

  const filteredBrands = brands.filter((b) =>
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-5 space-y-6">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2 font-bold text-gray-900 text-base">
          <Filter className="w-4 h-4 text-brand" />
          <span>Filters</span>
        </div>
        <button
          type="button"
          onClick={resetAllFilters}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Categories Tree */}
      <div>
        <h4 className="font-bold text-sm text-gray-900 mb-3 uppercase tracking-wider text-[11px] text-gray-500">
          Categories
        </h4>
        <ul className="space-y-1 text-sm">
          <li>
            <Link
              href="/products"
              className={`block py-1.5 px-2 rounded font-medium transition-colors ${
                !currentCategorySlug
                  ? 'bg-teal-50 text-brand font-bold'
                  : 'text-gray-700 hover:text-brand hover:bg-gray-50'
              }`}
            >
              All Categories
            </Link>
          </li>
          {categories.map((cat) => {
            const isSelected = currentCategorySlug === cat.slug;
            const isExpanded = expandedCategories[cat.slug] || isSelected;
            const hasChildren = cat.children && cat.children.length > 0;

            return (
              <li key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between group">
                  <Link
                    href={`/categories/${cat.slug}`}
                    className={`flex-grow py-1.5 px-2 rounded font-medium transition-colors ${
                      isSelected
                        ? 'bg-teal-50 text-brand font-bold'
                        : 'text-gray-700 group-hover:text-brand group-hover:bg-gray-50'
                    }`}
                  >
                    {cat.name}
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.slug)}
                      className="p-1 text-gray-400 hover:text-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Subcategories */}
                {hasChildren && isExpanded && (
                  <ul className="pl-4 space-y-1 border-l-2 border-gray-100 ml-2">
                    {cat.children!.map((sub) => {
                      const isSubSelected = currentCategorySlug === sub.slug;
                      return (
                        <li key={sub.id}>
                          <Link
                            href={`/categories/${sub.slug}`}
                            className={`block py-1 px-2 rounded text-xs transition-colors ${
                              isSubSelected
                                ? 'bg-teal-50 text-brand font-bold'
                                : 'text-gray-600 hover:text-brand hover:bg-gray-50'
                            }`}
                          >
                            {sub.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Price Range Filter */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="font-bold text-sm text-gray-900 mb-3 uppercase tracking-wider text-[11px] text-gray-500">
          {t('products.priceRange')} ({config.code} - {config.symbol})
        </h4>
        <form onSubmit={applyPriceFilter} className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={`${t('products.minPrice')} (${config.symbol})`}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
              min="0"
            />
            <span className="text-gray-400 text-xs">-</span>
            <input
              type="number"
              placeholder={`${t('products.maxPrice')} (${config.symbol})`}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
              min="0"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition"
          >
            {t('products.applyPrice')}
          </button>
        </form>
      </div>

      {/* Brand Filter with Live Search */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="font-bold text-sm text-gray-900 mb-2 uppercase tracking-wider text-[11px] text-gray-500">
          Brand
        </h4>
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search brand..."
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1.5" />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
          {filteredBrands.map((brand) => (
            <label
              key={brand}
              className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-brand py-0.5"
            >
              <input
                type="checkbox"
                checked={selectedBrand === brand}
                onChange={() => handleBrandSelect(brand)}
                className="rounded border-gray-300 text-brand focus:ring-brand w-3.5 h-3.5"
              />
              <span className={selectedBrand === brand ? 'font-bold text-brand' : ''}>
                {brand}
              </span>
            </label>
          ))}
          {filteredBrands.length === 0 && (
            <div className="text-xs text-gray-400 italic py-1">No brands found</div>
          )}
        </div>
      </div>
    </div>
  );
}
