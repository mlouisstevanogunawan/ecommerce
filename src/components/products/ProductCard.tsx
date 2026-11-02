'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Star, SlidersHorizontal } from 'lucide-react';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Price } from '@/components/currency/Price';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { useCart } from '@/components/cart/CartProvider';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className = '' }: ProductCardProps) {
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const inWishlist = isInWishlist(product.id);
  const hasVariants = Boolean(product.variants && product.variants.length > 0);

  const defaultImg = product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80';
  const hoverImg = product.images?.[1]?.image_url || defaultImg;
  const sellerTitle = product.store?.title || 'Modesy Store';
  const sellerSlug = product.store?.slug || 'trendshop';

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      router.push(`/${product.slug}`);
    } else {
      addToCart(product, 1);
    }
  };

  return (
    <div className={`product-card group ${className}`}>
      {/* Badges */}
      {product.discount_rate > 0 ? (
        <div className="badge-discount">-{product.discount_rate}%</div>
      ) : product.is_featured ? (
        <div className="badge-featured">Featured</div>
      ) : null}

      {/* Action Overlay */}
      <div className="product-actions-overlay">
        <button
          type="button"
          onClick={handleActionClick}
          className="action-icon-btn"
          title={hasVariants ? 'Select Options' : 'Add to Cart'}
          aria-label={hasVariants ? 'Select Options' : 'Add to Cart'}
        >
          {hasVariants ? <SlidersHorizontal className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`action-icon-btn ${inWishlist ? 'text-rose-600 bg-rose-50' : ''}`}
          title="Wishlist"
          aria-label="Wishlist"
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-rose-600 text-rose-600' : ''}`} />
        </button>
      </div>

      {/* Image Container with Hover Swap */}
      <Link href={`/${product.slug}`} className="image-container block">
        <img
          src={defaultImg}
          alt={product.title}
          className="default-img w-full h-full object-cover transition-opacity duration-300"
          loading="lazy"
        />
        <img
          src={hoverImg}
          alt={`${product.title} preview`}
          className="hover-img w-full h-full object-cover transition-all duration-300"
          loading="lazy"
        />
      </Link>

      {/* Card Body */}
      <div className="p-3 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-brand transition-colors">
            <Link href={`/${product.slug}`}>{product.title}</Link>
          </h3>
          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            <Link href={`/profile/${sellerSlug}`} className="hover:text-brand hover:underline">
              {sellerTitle}
            </Link>
          </div>
        </div>

        <div className="mt-2">
          {/* Rating & Views */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.round(product.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Heart className="w-3 h-3" />
              <span>{product.views_count ? Math.floor(product.views_count / 15) : 0}</span>
            </div>
          </div>

          {/* Pricing matching Modesy style */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            {product.discounted_price === 0 ? (
              <span className="text-emerald-600 font-bold text-sm">Free</span>
            ) : (
              <>
                <Price
                  amount={product.discounted_price}
                  className="text-brand font-bold text-[0.938rem] whitespace-nowrap"
                />
                {product.discount_rate > 0 && (
                  <del className="text-[#868e96] text-[0.875rem] font-normal whitespace-nowrap">
                    <Price amount={product.price} />
                  </del>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
