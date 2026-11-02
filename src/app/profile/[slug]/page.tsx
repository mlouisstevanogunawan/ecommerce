import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  UserCheck,
  MapPin,
  Phone,
  Package,
  Star,
  ShoppingBag,
  Heart,
  Store,
} from 'lucide-react';
import { getShopBySlug } from '@/lib/supabase/data';
import { ProductCard } from '@/components/products/ProductCard';
import { SellerProfileActions } from '@/components/profile/SellerProfileActions';

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 30;

export default async function SellerProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;
  const data = await getShopBySlug(slug);

  if (!data) {
    notFound();
  }

  const { store, products } = data;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* 1. Full-width Store Cover Banner */}
      <div className="relative w-full h-56 sm:h-72 lg:h-80 bg-gray-900 overflow-hidden">
        <img
          src={store.cover_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80'}
          alt={`${store.title} Cover`}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      <div className="modesy-container relative -mt-16 sm:-mt-20 z-10">
        {/* 2. Store Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Store Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-white shrink-0">
                <img
                  src={store.logo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80'}
                  alt={store.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Store Details */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-extrabold text-gray-900">{store.title}</h1>
                  {store.is_verified && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Seller
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
                  {store.description}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-500 pt-1">
                  {store.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-brand" />
                      {store.address}
                    </span>
                  )}
                  {store.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-brand" />
                      {store.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {store.rating} Rating
                  </span>
                </div>
              </div>
            </div>

            {/* Follow & Message Client Actions */}
            <SellerProfileActions store={store} />
          </div>

          {/* Stats Summary Bar */}
          <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-gray-100 text-center text-xs">
            <div>
              <span className="font-extrabold text-gray-900 text-lg block">{products.length}</span>
              <span className="text-gray-400">Total Products</span>
            </div>
            <div>
              <span className="font-extrabold text-gray-900 text-lg block">{store.sales_count}</span>
              <span className="text-gray-400">Total Orders Fulfilled</span>
            </div>
            <div>
              <span className="font-extrabold text-gray-900 text-lg block">99.8%</span>
              <span className="text-gray-400">Positive Feedback</span>
            </div>
          </div>
        </div>

        {/* 3. Products by this Seller */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand" />
              <span>Products from {store.title} ({products.length})</span>
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-base mb-1">No products listed</h3>
              <p className="text-xs text-gray-500">This vendor hasn&apos;t added any products yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
