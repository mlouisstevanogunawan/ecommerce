'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Check, X, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from './CartProvider';
import { formatCurrency } from '@/lib/utils';
import { effectivePrice } from '@/lib/pricing';
import { Price } from '@/components/currency/Price';
import { useTranslation } from '@/components/i18n/I18nProvider';

export function AddedToCartModal() {
  const { isCartModalOpen, closeCartModal, lastAddedProduct, cart } = useCart();

  if (!isCartModalOpen || !lastAddedProduct) return null;

  const { product, quantity } = lastAddedProduct;
  const primaryImg = product.images?.[0]?.image_url || '/placeholder-product.svg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-base">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white">
              <Check className="w-4 h-4 stroke-[3]" />
            </span>
            <span>Product successfully added to your cart!</span>
          </div>
          <button
            onClick={closeCartModal}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative w-20 h-20 rounded-md overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
              <img
                src={primaryImg}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2">
                {product.title}
              </h4>
              <p className="text-sm text-gray-500 mt-1">Quantity: <span className="font-medium text-gray-800">{quantity}</span></p>
              <div className="mt-2 flex items-center gap-2">
                <Price
                  amount={effectivePrice(null, product)}
                  className="text-brand font-bold text-lg"
                />
                {product.discount_rate > 0 && (
                  <del className="text-gray-400 text-sm">
                    <Price amount={product.price} />
                  </del>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-gray-50 rounded-md flex items-center justify-between text-sm">
            <span className="text-gray-600">Cart Subtotal ({cart.items.length} items):</span>
            <Price amount={cart.subtotal} className="font-bold text-gray-900 text-base" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={closeCartModal}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition"
          >
            Continue Shopping
          </button>
          <Link
            href="/cart"
            onClick={closeCartModal}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-md shadow-sm transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Go to Cart</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
