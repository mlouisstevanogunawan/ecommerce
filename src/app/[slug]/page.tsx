import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getProductBySlug, getRelatedProducts, getReviews, getCheckoutRules } from '@/lib/supabase/data';
import { ProductDetailView } from '@/components/products/ProductDetailView';
import { ProductCard } from '@/components/products/ProductCard';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Stock, price and ratings come from the database on every request; a cached
// copy of this page would show numbers that place_order no longer agrees with.
export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [relatedProducts, reviews, rules] = await Promise.all([
    getRelatedProducts(product, 4),
    getReviews(product.id),
    getCheckoutRules(),
  ]);

  return (
    <div className="bg-gray-50 min-h-screen py-6">
      <div className="modesy-container">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium overflow-x-auto whitespace-nowrap pb-1">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <Link href="/products" className="hover:text-brand transition">Products</Link>
          {product.category && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <Link href={`/categories/${product.category.slug}`} className="hover:text-brand transition">
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-gray-900 font-bold truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Main Product Card Container */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 mb-8 shadow-xs">
          <ProductDetailView
            product={product}
            relatedProducts={relatedProducts}
            reviews={reviews}
            freeShippingThreshold={rules.free_shipping_threshold}
            flatShippingFee={rules.flat_shipping_fee}
          />
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                Related Products
              </h3>
              <Link
                href={`/categories/${product.category?.slug || 'clothing'}`}
                className="text-xs font-bold text-brand hover:underline"
              >
                View More
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
