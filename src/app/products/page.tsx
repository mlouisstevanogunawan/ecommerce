import React, { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight, PackageOpen } from 'lucide-react';
import { getCategories, getProducts } from '@/lib/supabase/data';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductFiltersSidebar } from '@/components/products/ProductFiltersSidebar';
import { ProductSortToolbar } from '@/components/products/ProductSortToolbar';

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: 'newest' | 'lowest_price' | 'highest_price' | 'highest_rating';
    page?: string;
  }>;
}

export const revalidate = 30;

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const categories = await getCategories();

  const products = await getProducts({
    search: resolvedParams.search,
    category: resolvedParams.category,
    brand: resolvedParams.brand,
    minPrice: resolvedParams.minPrice ? Number(resolvedParams.minPrice) : undefined,
    maxPrice: resolvedParams.maxPrice ? Number(resolvedParams.maxPrice) : undefined,
    sort: resolvedParams.sort,
  });

  return (
    <div className="bg-gray-50 min-h-screen py-6">
      <div className="modesy-container">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">Products</span>
          {resolvedParams.search && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-brand font-semibold">&ldquo;{resolvedParams.search}&rdquo;</span>
            </>
          )}
        </nav>

        {/* 2-Column Catalog Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Sidebar Filter */}
          <aside className="lg:col-span-1">
            <Suspense fallback={<div className="h-96 bg-white rounded-lg animate-pulse" />}>
              <ProductFiltersSidebar
                categories={categories}
                currentCategorySlug={resolvedParams.category}
              />
            </Suspense>
          </aside>

          {/* Right Product Grid */}
          <main className="lg:col-span-3">
            <Suspense fallback={<div className="h-12 bg-white rounded-lg animate-pulse mb-6" />}>
              <ProductSortToolbar totalCount={products.length} />
            </Suspense>

            {products.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                  <PackageOpen className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">No products found</h3>
                <p className="text-xs text-gray-500 max-w-sm mb-6">
                  We couldn&apos;t find any products matching your current filters. Try resetting or adjusting the criteria.
                </p>
                <Link
                  href="/products"
                  className="px-5 py-2 bg-brand text-white text-xs font-bold rounded-md hover:bg-brand-dark transition"
                >
                  Clear All Filters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
