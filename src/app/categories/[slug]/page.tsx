import React, { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, PackageOpen } from 'lucide-react';
import { getCategories, getProducts } from '@/lib/supabase/data';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductFiltersSidebar } from '@/components/products/ProductFiltersSidebar';
import { ProductSortToolbar } from '@/components/products/ProductSortToolbar';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: 'newest' | 'lowest_price' | 'highest_price' | 'highest_rating';
  }>;
}

export const revalidate = 30;

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const resolvedParams = await searchParams;

  const categories = await getCategories();
  
  // Find current category or subcategory
  let currentCategory = categories.find((c) => c.slug === slug);
  if (!currentCategory) {
    for (const parent of categories) {
      const sub = parent.children?.find((c) => c.slug === slug);
      if (sub) {
        currentCategory = sub;
        break;
      }
    }
  }

  if (!currentCategory) {
    notFound();
  }

  const products = await getProducts({
    category: slug,
    brand: resolvedParams.brand,
    minPrice: resolvedParams.minPrice ? Number(resolvedParams.minPrice) : undefined,
    maxPrice: resolvedParams.maxPrice ? Number(resolvedParams.maxPrice) : undefined,
    sort: resolvedParams.sort,
  });

  return (
    <div className="bg-gray-50 min-h-screen py-6">
      <div className="modesy-container">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link href="/products" className="hover:text-brand transition">Categories</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">{currentCategory.name}</span>
        </nav>

        {/* Category Header Banner */}
        <div className="relative rounded-lg overflow-hidden mb-8 h-40 sm:h-48 bg-gray-900">
          <img
            src={currentCategory.image_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80'}
            alt={currentCategory.name}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex flex-col justify-center px-8 text-white">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">
              {currentCategory.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 max-w-md">
              Explore our curated selection of quality {currentCategory.name.toLowerCase()} items.
            </p>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <aside className="lg:col-span-1">
            <Suspense fallback={<div className="h-96 bg-white rounded-lg animate-pulse" />}>
              <ProductFiltersSidebar
                categories={categories}
                currentCategorySlug={slug}
              />
            </Suspense>
          </aside>

          <main className="lg:col-span-3">
            <Suspense fallback={<div className="h-12 bg-white rounded-lg animate-pulse mb-6" />}>
              <ProductSortToolbar totalCount={products.length} />
            </Suspense>

            {products.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                  <PackageOpen className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">No products found in this category</h3>
                <p className="text-xs text-gray-500 max-w-sm mb-6">
                  We currently do not have products matching the selected criteria.
                </p>
                <Link
                  href="/products"
                  className="px-5 py-2 bg-brand text-white text-xs font-bold rounded-md hover:bg-brand-dark transition"
                >
                  View All Products
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
