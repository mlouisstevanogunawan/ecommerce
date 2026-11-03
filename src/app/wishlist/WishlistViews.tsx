'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import { Product } from '@/lib/types';
import { Price } from '@/components/currency/Price';

export function WishlistGrid({ products }: { products: Product[] }) {
  const { toggleWishlist, addToCart, wishlistError } = useCart();
  const router = useRouter();

  const handleToggle = (productId: string) => {
    toggleWishlist(productId);
    // The saved list lives in the database, so the grid has to be re-read.
    router.refresh();
  };

  return (
    <>
      {wishlistError && (
        <div className="m-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{wishlistError}</span>
        </div>
      )}

      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const img = product.images?.[0]?.image_url;
          return (
            <div
              key={product.id}
              className="border border-gray-200 rounded-lg overflow-hidden group hover:shadow-md transition flex flex-col justify-between bg-white"
            >
              <Link href={`/${product.slug}`} className="block relative aspect-3/4 overflow-hidden bg-gray-50">
                {img ? (
                  <img
                    src={img}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                    No image
                  </div>
                )}
                {product.discount_rate > 0 && (
                  <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    -{product.discount_rate}%
                  </span>
                )}
              </Link>

              <div className="p-4 flex flex-col flex-grow justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-brand transition">
                    <Link href={`/${product.slug}`}>{product.title}</Link>
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Price
                      amount={product.discounted_price}
                      className="text-sm font-bold text-brand"
                    />
                    {product.discount_rate > 0 && (
                      <del className="text-xs text-gray-400">
                        <Price amount={product.price} />
                      </del>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => addToCart(product, 1)}
                    disabled={product.stock <= 0}
                    className="flex-grow flex items-center justify-center gap-1.5 py-1.5 px-3 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition disabled:opacity-50"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(product.id)}
                    className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-rose-600 hover:border-rose-300 transition"
                    title="Remove from Wishlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function WishlistEmpty() {
  return (
    <div className="p-16 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-400 mx-auto flex items-center justify-center mb-4">
        <Heart className="w-8 h-8" />
      </div>
      <h3 className="font-bold text-base text-gray-800 mb-1">Your wishlist is empty</h3>
      <p className="text-xs text-gray-500 mb-6">
        Explore our collections and tap the heart icon on items you love.
      </p>
      <Link
        href="/products"
        className="px-6 py-2.5 bg-brand text-white text-xs font-bold rounded hover:bg-brand-dark transition"
      >
        Explore Products
      </Link>
    </div>
  );
}
