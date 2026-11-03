'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  Tag,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import { unitPrice } from '@/lib/pricing';
import { Price } from '@/components/currency/Price';
import { useTranslation } from '@/components/i18n/I18nProvider';

interface ShippingRules {
  free_shipping_threshold: number;
  flat_shipping_fee: number;
}

export default function CartPage() {
  const { cart, isLoaded, userId, cartError, updateQuantity, removeFromCart } = useCart();
  const { t } = useTranslation();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  // Shipping thresholds come from checkout_rules() in Postgres so the estimate
  // shown here is the same one place_order() will bill.
  const [rules, setRules] = useState<ShippingRules | null>(null);
  const [rulesError, setRulesError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/checkout/rules', { cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? 'Checkout rules are unavailable');
        if (cancelled) return;
        setRules({
          free_shipping_threshold: Number(payload.free_shipping_threshold) || 0,
          flat_shipping_fee: Number(payload.flat_shipping_fee) || 0,
        });
        setRulesError('');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRulesError(error instanceof Error ? error.message : 'Checkout rules are unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = cart.subtotal;

  // The code is validated by the database, then re-validated whenever the
  // subtotal changes so a minimum-spend coupon cannot stay applied after it
  // has stopped qualifying.
  useEffect(() => {
    if (!appliedCode) {
      setCouponDiscount(0);
      return;
    }
    let cancelled = false;

    fetch(`/api/checkout/coupon?code=${encodeURIComponent(appliedCode)}&subtotal=${subtotal}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? 'Coupon could not be validated');
        if (cancelled) return;
        setCouponDiscount(Number(payload.discount) || 0);
        setCouponError('');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCouponDiscount(0);
        setAppliedCode('');
        setCouponError(error instanceof Error ? error.message : 'Coupon could not be validated');
      });

    return () => {
      cancelled = true;
    };
  }, [appliedCode, subtotal]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Enter a coupon code.');
      return;
    }
    if (!userId) {
      setCouponError('Please sign in to apply a coupon.');
      return;
    }
    setCouponError('');
    setAppliedCode(cleanCode);
  };

  const removeCoupon = () => {
    setAppliedCode('');
    setCouponDiscount(0);
    setCouponCode('');
    setCouponError('');
  };

  const shippingFee = rules === null ? 0 : subtotal >= rules.free_shipping_threshold ? 0 : rules.flat_shipping_fee;
  const total = Math.max(0, Math.round((subtotal - couponDiscount + shippingFee) * 100) / 100);

  // The cart is not known yet: show a loader rather than flashing "empty".
  if (!isLoaded) {
    return (
      <div className="bg-gray-50 min-h-[70vh] py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-semibold">Loading your cart...</p>
        </div>
      </div>
    );
  }

  // A failed read is reported as a failure, never as an empty cart.
  if (cartError) {
    return (
      <div className="bg-gray-50 min-h-[70vh] py-16 flex items-center justify-center">
        <div className="modesy-container text-center max-w-md bg-white p-8 rounded-lg border border-rose-200 shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-700 mb-2">Your cart could not be loaded</h2>
          <p className="text-xs text-gray-600 mb-6">{cartError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-brand text-white font-bold rounded-md hover:bg-brand-dark transition text-xs"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="bg-gray-50 min-h-[70vh] py-16 flex items-center justify-center">
        <div className="modesy-container text-center max-w-md bg-white p-8 sm:p-12 rounded-lg border border-gray-200 shadow-xs">
          <div className="w-20 h-20 rounded-full bg-teal-50 text-brand mx-auto flex items-center justify-center mb-6">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Cart is Empty</h2>
          <p className="text-sm text-gray-500 mb-8">
            Looks like you haven&apos;t added any items to your shopping cart yet.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-dark text-white font-bold rounded-md transition shadow-sm text-sm"
          >
            <span>Explore Products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
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
          <span className="text-gray-900 font-bold">Shopping Cart</span>
        </nav>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Shopping Cart ({cart.items.reduce((acc, i) => acc + i.quantity, 0)} items)
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Table / List (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
              <div className="hidden sm:grid grid-cols-12 bg-gray-50 px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div className="divide-y divide-gray-100">
                {cart.items.map((item) => {
                  const itemImg = item.product.images?.[0]?.image_url || '/placeholder-product.svg';
                  const unit = unitPrice(item);
                  const lineTotal = unit * item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center"
                    >
                      {/* Product Info */}
                      <div className="sm:col-span-6 flex items-center gap-4">
                        <Link href={`/${item.product.slug}`} className="w-18 h-22 rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50">
                          <img src={itemImg} alt={item.product.title} className="w-full h-full object-cover" />
                        </Link>
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-gray-900 hover:text-brand transition line-clamp-1">
                            <Link href={`/${item.product.slug}`}>{item.product.title}</Link>
                          </h3>
                          {item.product.store?.title ? (
                            <div className="text-xs text-gray-500">
                              Seller: <span className="font-semibold text-gray-700">{item.product.store.title}</span>
                            </div>
                          ) : null}
                          {item.variant && (
                            <div className="inline-block text-[11px] font-semibold text-brand bg-teal-50 px-2 py-0.5 rounded">
                              Option: {item.variant.name}
                            </div>
                          )}
                          <div className="sm:hidden text-xs font-bold text-gray-900 pt-1">
                            <Price amount={unit} />
                          </div>
                        </div>
                      </div>

                      {/* Unit Price (Desktop) */}
                      <div className="hidden sm:block sm:col-span-2 text-center text-sm font-semibold text-gray-800">
                        <Price amount={unit} />
                      </div>

                      {/* Quantity Controls */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-center gap-2">
                        <div className="flex items-center border border-gray-300 rounded bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="sm:hidden text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Line Total & Remove (Desktop) */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-3 text-right">
                        <Price amount={lineTotal} className="text-base font-bold text-brand" />
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="hidden sm:inline-flex text-gray-400 hover:text-rose-600 p-1 transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <Link
                  href="/products"
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-brand transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Continue Shopping</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Summary Box (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Coupon Code Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900 mb-3">
                <Tag className="w-4 h-4 text-brand" />
                <span>Have a Discount Coupon?</span>
              </div>

              {appliedCode ? (
                <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded text-xs text-teal-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand" />
                    <span>
                      Coupon <strong>{appliedCode}</strong> applied
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-grow px-3 py-2 border border-gray-300 rounded text-xs uppercase font-medium focus:outline-none focus:border-brand"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded text-xs font-bold transition"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-rose-600 font-medium">{couponError}</p>
                  )}
                  {!userId && (
                    <p className="text-[11px] text-gray-500">
                      <Link href="/login?redirect=%2Fcart" className="font-bold text-brand hover:underline">
                        Sign in
                      </Link>{' '}
                      to apply a coupon.
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Order Summary Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-gray-900 pb-3 border-b border-gray-100">
                Order Summary
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <Price amount={subtotal} className="font-bold text-gray-900" />
                </div>

                {appliedCode && couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-teal-700 font-semibold">
                    <span>{t('cart.discount')}</span>
                    <span>-<Price amount={couponDiscount} /></span>
                  </div>
                )}

                <div className="flex items-center justify-between text-gray-600">
                  <span>{t('cart.shipping')}</span>
                  {rules === null ? (
                    <span className="text-gray-400 font-semibold">—</span>
                  ) : shippingFee === 0 ? (
                    <strong className="text-emerald-600">{t('common.free')}</strong>
                  ) : (
                    <Price amount={shippingFee} />
                  )}
                </div>

                {rules !== null && shippingFee > 0 && (
                  <p className="text-[11px] text-amber-600">
                    Add <Price amount={Math.max(0, rules.free_shipping_threshold - subtotal)} /> more to qualify for Free Shipping!
                  </p>
                )}

                {rulesError && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    Shipping could not be estimated ({rulesError}). The total is confirmed at checkout.
                  </p>
                )}

                <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-900">{t('cart.total')}</span>
                  <Price amount={total} className="text-xl font-extrabold text-brand" />
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/checkout${appliedCode ? `?coupon=${encodeURIComponent(appliedCode)}` : ''}`}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-brand hover:bg-brand-dark text-white font-bold rounded-md shadow-sm transition transform hover:-translate-y-0.5 text-sm"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {!userId && (
                  <p className="pt-2 text-[11px] text-gray-500 text-center">
                    You&apos;ll be asked to sign in before the order is placed.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Orders are saved to your signed-in account</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
