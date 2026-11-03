'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Star, SlidersHorizontal, Eye } from 'lucide-react';
import { Product } from '@/lib/types';
import { effectivePrice } from '@/lib/pricing';
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

  const defaultImg = product.images?.[0]?.image_url || '/placeholder-product.svg';
  const hoverImg = product.images?.[1]?.image_url || defaultImg;
  const storeSlug = product.store?.slug;

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
            {storeSlug && product.store?.title ? (
              <Link href={`/profile/${storeSlug}`} className="hover:text-brand hover:underline">
                {product.store.title}
              </Link>
            ) : (
              <span>Store unavailable</span>
            )}
          </div>
        </div>

        <div className="mt-2">
          {/* Rating & Views */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <div className="flex items-center gap-1">
              <div className="flex items-center text-amber-400" aria-hidden="true">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.round(product.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-500">
                {(product.reviews_count ?? 0) > 0
                  ? `${(product.rating ?? 0).toFixed(1)} (${product.reviews_count})`
                  : 'No ratings yet'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500" title={`${product.views_count} views`}>
              <Eye className="w-3.5 h-3.5" />
              <span>{product.views_count ?? 0}</span>
            </div>
          </div>

          {/* Pricing matching Modesy style */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <Price
              amount={effectivePrice(null, product)}
              className="text-brand font-bold text-[0.938rem] whitespace-nowrap"
            />
            {product.discount_rate > 0 && (
              <del className="text-[#868e96] text-[0.875rem] font-normal whitespace-nowrap">
                <Price amount={product.price} />
              </del>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
