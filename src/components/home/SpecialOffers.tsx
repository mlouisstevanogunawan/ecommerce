'use client';

import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/products/ProductCard';

interface SpecialOffersProps {
  products: Product[];
}

export function SpecialOffers({ products }: SpecialOffersProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-8 bg-gray-50 border-y border-gray-200/80">
      <div className="modesy-container">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-3 mb-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Special Offers
              </h3>
              <p className="text-xs text-gray-500">Discounted items for a limited time only</p>
            </div>
          </div>
          <Link
            href="/products?sort=discount"
            className="flex items-center gap-1.5 text-sm font-bold text-brand hover:text-brand-dark transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
