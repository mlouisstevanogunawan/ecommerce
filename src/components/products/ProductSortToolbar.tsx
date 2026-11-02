'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react';

interface ProductSortToolbarProps {
  totalCount: number;
  onOpenMobileFilters?: () => void;
}

export function ProductSortToolbar({ totalCount, onOpenMobileFilters }: ProductSortToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get('sort') || 'newest';

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', e.target.value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 gap-3 mb-6">
      {/* Total Found */}
      <div className="text-sm text-gray-600 font-medium">
        Showing <span className="font-bold text-gray-900">{totalCount}</span> products found
      </div>

      <div className="flex items-center gap-3">
        {/* Mobile Filter Trigger */}
        {onOpenMobileFilters && (
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
            <span>Filters</span>
          </button>
        )}

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            Sort By:
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={handleSortChange}
            className="border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:border-brand font-medium"
          >
            <option value="newest">Most Recent</option>
            <option value="lowest_price">Lowest Price</option>
            <option value="highest_price">Highest Price</option>
            <option value="highest_rating">Highest Rating</option>
          </select>
        </div>
      </div>
    </div>
  );
}
