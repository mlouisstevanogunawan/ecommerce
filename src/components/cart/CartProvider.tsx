'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cartSubtotal, unitPrice } from '@/lib/pricing';
import { Cart, CartItem, Product, ProductVariant } from '@/lib/types';

interface CartContextType {
  cart: Cart;
  isLoaded: boolean;
  userId: string | null;
  cartError: string;
  wishlistError: string;
  wishlistIds: string[];
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant | null) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearCart: () => void;
  cartCount: number;
  lastAddedProduct: { product: Product; quantity: number } | null;
  isCartModalOpen: boolean;
  closeCartModal: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'modesy_cart';
const WISHLIST_KEY = 'modesy_wishlist';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private-mode failures must not break the session.
  }
}

function toLines(items: CartItem[]) {
  return items.map((item) => ({
    product_id: item.product_id,
    variant_id: item.variant_id ?? null,
    quantity: item.quantity,
  }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [cartError, setCartError] = useState('');
  const [wishlistError, setWishlistError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [lastAddedProduct, setLastAddedProduct] = useState<{ product: Product; quantity: number } | null>(null);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const requestSeq = useRef(0);

  // The cart lives in localStorage for guests and in the database for signed-in
  // users. Nothing here falls back to a shared server-side "guest" cart.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setCartError('Sign-in state could not be read. Please refresh the page.');
          setUserId(null);
          return;
        }
        setUserId(data.session?.user.id ?? null);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load wishlist ids for the badge.
  useEffect(() => {
    if (!authChecked) return;
    if (!userId) {
      setWishlistIds(readLocal<string[]>(WISHLIST_KEY, []));
      return;
    }
    fetch('/api/wishlist')
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? 'Failed to load wishlist');
        setWishlistIds((payload.ids ?? []) as string[]);
        setWishlistError('');
      })
      .catch((error: unknown) => {
        // A signed-in user gets no list plus an error, never a stale local copy
        // that would claim items are saved when the database says otherwise. The
        // cart itself is unaffected, so this must not surface as a cart error.
        setWishlistIds([]);
        setWishlistError(error instanceof Error ? error.message : 'Wishlist is unavailable');
      });
  }, [authChecked, userId]);

  // Signed-in: the saved cart is the source of truth. A local cart that has
  // never been synced is pushed up once, then the server copy takes over.
  // `isLoaded` only becomes true once the cart is actually known, so pages can
  // distinguish "still loading" from "genuinely empty".
  useEffect(() => {
    if (!authChecked) return;

    if (!userId) {
      setItems(readLocal<CartItem[]>(CART_KEY, []));
      setIsLoaded(true);
      return;
    }

    const local = readLocal<CartItem[]>(CART_KEY, []);
    let cancelled = false;

    fetch('/api/cart')
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? 'Failed to load cart');
        if (cancelled) return;

        const serverItems = (payload.cart.items ?? []) as CartItem[];
        if (serverItems.length === 0 && local.length > 0) {
          const pushed = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync', items: toLines(local) }),
          });
          const pushPayload = await pushed.json();
          if (!pushed.ok) throw new Error(pushPayload.error ?? 'Failed to save cart');
          setItems((pushPayload.cart.items ?? []) as CartItem[]);
        } else {
          setItems(serverItems);
        }
        // The saved cart owns this account from now on. Dropping the local copy
        // stops a signed-in cart from being inherited by the next guest session
        // after a logout.
        localStorage.removeItem(CART_KEY);
        setCartError('');
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCartError(error instanceof Error ? error.message : 'Cart is unavailable');
        setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authChecked, userId]);

  // Only a loaded cart may be written back, otherwise the empty array of the
  // first render would erase the stored cart before auth has been checked.
  useEffect(() => {
    if (!userId && isLoaded) writeLocal(CART_KEY, items);
  }, [items, userId, isLoaded]);

  useEffect(() => {
    if (!userId && authChecked) writeLocal(WISHLIST_KEY, wishlistIds);
  }, [wishlistIds, userId, authChecked]);

  // Sends the whole cart as the canonical state; the database decides what is
  // actually addable (stock, published), so the response replaces local state.
  const persistCart = useCallback(
    async (nextItems: CartItem[]) => {
      setItems(nextItems);
      if (!userId) return;

      const seq = ++requestSeq.current;
      try {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync', items: toLines(nextItems) }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? 'Failed to save cart');
        if (seq !== requestSeq.current) return;
        setItems((payload.cart.items ?? []) as CartItem[]);
        setCartError('');
      } catch (error: unknown) {
        if (seq !== requestSeq.current) return;
        setCartError(error instanceof Error ? error.message : 'Failed to save cart');
      }
    },
    [userId],
  );

  const addToCart = (product: Product, quantity = 1, variant?: ProductVariant | null) => {
    const existing = items.find((item) => item.product_id === product.id && (item.variant_id ?? null) === (variant?.id ?? null));
    const next = existing
      ? items.map((item) => (item === existing ? { ...item, quantity: item.quantity + quantity } : item))
      : [
          ...items,
          {
            id: `local_${product.id}_${variant?.id ?? 'base'}`,
            cart_id: 'local',
            product_id: product.id,
            variant_id: variant?.id ?? null,
            quantity,
            product,
            variant: variant ?? null,
          },
        ];

    void persistCart(next);
    setLastAddedProduct({ product, quantity });
    setIsCartModalOpen(true);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      void persistCart(items.filter((item) => item.id !== itemId));
      return;
    }
    void persistCart(items.map((item) => (item.id === itemId ? { ...item, quantity } : item)));
  };

  const removeFromCart = (itemId: string) => {
    void persistCart(items.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    void persistCart([]);
  };

  const toggleWishlist = (productId: string) => {
    const added = !wishlistIds.includes(productId);
    const optimistic = added ? [...wishlistIds, productId] : wishlistIds.filter((id) => id !== productId);
    setWishlistIds(optimistic);

    if (!userId) return;

    fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? 'Failed to update wishlist');
        setWishlistIds((payload.ids ?? []) as string[]);
        setWishlistError('');
      })
      .catch((error: unknown) => {
        // The optimistic change was never saved: put the list back rather than
        // leaving a heart icon that lies about what the database holds.
        setWishlistIds(wishlistIds);
        setWishlistError(error instanceof Error ? error.message : 'Failed to update wishlist');
      });
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  // Same expression the database charges with (see src/lib/pricing.ts), so the
  // cart, the checkout summary and the placed order cannot disagree.
  const subtotal = useMemo(() => cartSubtotal(items), [items]);

  const cart: Cart = { id: 'local_cart', items, subtotal, discount: 0, total: subtotal };
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoaded,
        userId,
        cartError,
        wishlistError,
        wishlistIds,
        addToCart,
        updateQuantity,
        removeFromCart,
        toggleWishlist,
        isInWishlist,
        clearCart,
        cartCount,
        lastAddedProduct,
        isCartModalOpen,
        closeCartModal: () => setIsCartModalOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
