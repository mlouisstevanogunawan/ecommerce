import React from 'react';
import Link from 'next/link';
import { AlertCircle, ChevronRight, Heart } from 'lucide-react';
import { getWishlist } from '@/lib/supabase/data';
import { WishlistEmpty, WishlistGrid } from './WishlistViews';

export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  let products;
  try {
    products = await getWishlist();
  } catch (error) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="modesy-container">
          <div className="bg-white rounded-lg border border-rose-200 p-8 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
            <h1 className="text-lg font-extrabold text-rose-700 mb-2">Wishlist unavailable</h1>
            <p className="text-xs text-gray-600 mb-6">
              {error instanceof Error ? error.message : 'The saved list could not be read from the database.'}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-md text-xs font-bold transition"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">Wishlist</span>
        </nav>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                <span>My Wishlist ({products.length} items)</span>
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Products you have saved to purchase later.
              </p>
            </div>
          </div>

          {products.length === 0 ? <WishlistEmpty /> : <WishlistGrid products={products} />}
        </div>
      </div>
    </div>
  );
}
