'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  CreditCard,
  Truck,
  ShieldCheck,
  Building,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Lock,
  Info,
} from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import { unitPrice } from '@/lib/pricing';
import { Price } from '@/components/currency/Price';
import { useCurrency } from '@/components/currency/CurrencyProvider';
import { useTranslation } from '@/components/i18n/I18nProvider';

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponFromQuery = (searchParams.get('coupon') ?? '').toUpperCase();

  const { cart, isLoaded, userId, cartError, clearCart } = useCart();
  const { currency, exchangeRate, formatPrice, rateSource } = useCurrency();
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [contextError, setContextError] = useState('');
  const [rules, setRules] = useState({ free_shipping_threshold: 0, flat_shipping_fee: 0 });
  const [couponDiscount, setCouponDiscount] = useState(0);
  // A coupon that the server rejected and a coupon that could not be checked at
  // all are different facts, and only the second one may not be ordered around.
  const [couponProblem, setCouponProblem] = useState<{ hard: boolean; message: string } | null>(null);
  const [couponRetry, setCouponRetry] = useState(0);

  // Generated once per checkout attempt and reused for every submit, so a
  // double click replays the original orders instead of creating new ones.
  const idempotencyKey = useRef(newIdempotencyKey());
  const placedRef = useRef(false);

  // Empty on purpose: shipping details are prefilled from the signed-in user's
  // saved address, never from a hardcoded sample person.
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    // COD is the honest default: the card path simulates payment, so it must be
    // an explicit choice rather than a pre-selected one.
    paymentMethod: 'cod', // credit_card (sandbox) | cod | bank_transfer
  });

  // A checkout needs a server-side cart, which only exists for a signed-in user.
  useEffect(() => {
    if (isLoaded && !userId) {
      router.replace('/login?redirect=%2Fcheckout');
    }
  }, [isLoaded, userId, router]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetch('/api/checkout/context', { cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? 'Could not load your details');
        if (cancelled) return;

        const nameParts = String(payload.fullName ?? '').trim().split(/\s+/);
        const saved = payload.address;

        setFormData((prev) => ({
          ...prev,
          firstName: saved?.first_name ?? nameParts[0] ?? '',
          lastName: saved?.last_name ?? nameParts.slice(1).join(' ') ?? '',
          email: payload.email ?? '',
          phone: saved?.phone ?? payload.phone ?? '',
          addressLine1: saved?.address_line1 ?? '',
          addressLine2: saved?.address_line2 ?? '',
          city: saved?.city ?? '',
          state: saved?.state ?? '',
          country: saved?.country ?? '',
          postalCode: saved?.postal_code ?? '',
        }));
        setRules({
          free_shipping_threshold: Number(payload.rules.free_shipping_threshold) || 0,
          flat_shipping_fee: Number(payload.rules.flat_shipping_fee) || 0,
        });
        setContextError('');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setContextError(error instanceof Error ? error.message : 'Could not load your details');
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const subtotal = cart.subtotal;

  // The coupon is validated against the coupons table so the banner, the cart
  // and the order total cannot drift into three different answers.
  useEffect(() => {
    if (!userId || !couponFromQuery) {
      setCouponDiscount(0);
      setCouponProblem(null);
      return;
    }
    let cancelled = false;

    fetch(`/api/checkout/coupon?code=${encodeURIComponent(couponFromQuery)}&subtotal=${subtotal}`)
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          const reason = String(payload?.error ?? 'the coupon could not be read');
          setCouponDiscount(0);
          setCouponProblem(
            res.status >= 500
              ? { hard: true, message: `The coupon service could not confirm “${couponFromQuery}” (${reason}). The total below may be wrong, so ordering is blocked until it answers.` }
              : { hard: false, message: `“${couponFromQuery}”: ${reason}` },
          );
          return;
        }
        const discount = Number(payload?.discount) || 0;
        setCouponDiscount(discount);
        setCouponProblem(discount === 0 ? { hard: false, message: `“${couponFromQuery}” gives no discount on this subtotal.` } : null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCouponDiscount(0);
        setCouponProblem({
          hard: true,
          message: `The coupon service could not confirm “${couponFromQuery}” (${error instanceof Error ? error.message : 'network error'}). The total below may be wrong, so ordering is blocked until it answers.`,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [couponFromQuery, subtotal, userId, couponRetry]);

  // Same expression the database uses in place_order().
  const shippingFee = subtotal >= rules.free_shipping_threshold ? 0 : rules.flat_shipping_fee;
  const total = Math.max(0, Math.round((subtotal - couponDiscount + shippingFee) * 100) / 100);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      const missing = ['firstName', 'lastName', 'email', 'phone', 'addressLine1', 'city', 'state', 'postalCode', 'country']
        .filter((field) => !String(formData[field as keyof typeof formData] ?? '').trim());
      if (missing.length > 0) {
        setErrorMessage(`Please complete the required shipping fields: ${missing.join(', ')}.`);
        return;
      }
      setErrorMessage('');
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting || placedRef.current) return; // block double submission
    if (couponProblem?.hard) {
      setErrorMessage(couponProblem.message);
      return;
    }
    if (cart.items.length === 0) {
      router.replace('/cart');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone.trim(),
          shippingAddress: {
            title: 'Shipping Address',
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            phone: formData.phone.trim(),
            address_line1: formData.addressLine1.trim(),
            address_line2: formData.addressLine2.trim() || null,
            city: formData.city.trim(),
            state: formData.state.trim(),
            country: formData.country.trim(),
            postal_code: formData.postalCode.trim(),
          },
          paymentMethod: formData.paymentMethod,
          couponCode: couponFromQuery || null,
          currency,
          exchangeRate,
          idempotencyKey: idempotencyKey.current,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // The database already emptied the saved cart; this drops the local copy.
      placedRef.current = true;
      clearCart();

      const numbers: string[] = (data.orders as { order_number: string }[]).map((o) => o.order_number);
      router.push(`/checkout/success?order_number=${encodeURIComponent(numbers[0])}${numbers.length > 1 ? `&orders=${encodeURIComponent(numbers.join(','))}` : ''}`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during checkout');
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="bg-gray-50 min-h-[60vh] py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-semibold">Loading checkout details...</p>
        </div>
      </div>
    );
  }

  // The cart could not be read: say so instead of claiming it is empty.
  if (cartError || contextError) {
    return (
      <div className="bg-gray-50 min-h-[60vh] py-16 flex items-center justify-center">
        <div className="modesy-container text-center max-w-md bg-white p-8 rounded-lg border border-rose-200 shadow-xs">
          <h2 className="text-xl font-bold text-rose-700 mb-2">Checkout is unavailable</h2>
          <p className="text-xs text-gray-600 mb-6">{cartError || contextError}</p>
          <Link
            href="/cart"
            className="px-5 py-2.5 bg-brand text-white font-bold rounded-md hover:bg-brand-dark transition text-xs"
          >
            Back to cart
          </Link>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="bg-gray-50 min-h-[60vh] py-16 flex items-center justify-center">
        <div className="modesy-container text-center max-w-md bg-white p-8 rounded-lg border border-gray-200 shadow-xs">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Shopping cart is empty</h2>
          <p className="text-xs text-gray-500 mb-6">Your shopping cart is currently empty. Please add items before checking out.</p>
          <Link
            href="/products"
            className="px-5 py-2.5 bg-brand text-white font-bold rounded-md hover:bg-brand-dark transition text-xs"
          >
            Browse Products
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
          <Link href="/cart" className="hover:text-brand transition">Cart</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">Checkout</span>
        </nav>

        {/* Stepper Progress Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8 shadow-xs">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* Step 1 */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 1 ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={`text-xs font-bold ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                Shipping
              </span>
            </div>

            <div className={`h-0.5 flex-grow mx-4 ${step >= 2 ? 'bg-brand' : 'bg-gray-200'}`} />

            {/* Step 2 */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 2 ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className={`text-xs font-bold ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                Payment
              </span>
            </div>

            <div className={`h-0.5 flex-grow mx-4 ${step === 3 ? 'bg-brand' : 'bg-gray-200'}`} />

            {/* Step 3 */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 3 ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                3
              </div>
              <span className={`text-xs font-bold ${step === 3 ? 'text-gray-900' : 'text-gray-400'}`}>
                Review
              </span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-semibold">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Step Content (8 cols) */}
          <div className="lg:col-span-8">
            {/* STEP 1: SHIPPING ADDRESS */}
            {step === 1 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-brand" />
                  <span>1. Shipping Information</span>
                </h2>

                <form onSubmit={handleNextStep} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      placeholder="House number and street name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Apartment, suite, etc. (optional)</label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">State / Province *</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code *</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Country *</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition shadow-xs"
                    >
                      <span>Continue to Payment</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: PAYMENT METHOD */}
            {step === 2 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand" />
                  <span>2. Payment Method</span>
                </h2>

                <form onSubmit={handleNextStep} className="space-y-6">
                  {/* Option 1: Credit Card Sandbox */}
                  <label
                    className={`block p-4 rounded-lg border-2 cursor-pointer transition ${
                      formData.paymentMethod === 'credit_card'
                        ? 'border-brand bg-teal-50/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="credit_card"
                          checked={formData.paymentMethod === 'credit_card'}
                          onChange={handleInputChange}
                          className="text-brand focus:ring-brand w-4 h-4"
                        />
                        <span className="font-bold text-sm text-gray-900">
                          Credit / Debit Card
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-brand bg-teal-100 px-2 py-0.5 rounded shrink-0">
                        Sandbox
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 pl-7 pt-1 leading-relaxed">
                      No card processor is connected to this store yet. Choosing this option records a
                      simulated, clearly-flagged sandbox payment in the database: no card details are asked
                      for and no money moves.
                    </p>
                  </label>

                  {/* Option 2: Cash On Delivery */}
                  <label
                    className={`block p-4 rounded-lg border-2 cursor-pointer transition ${
                      formData.paymentMethod === 'cod'
                        ? 'border-brand bg-teal-50/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={formData.paymentMethod === 'cod'}
                        onChange={handleInputChange}
                        className="text-brand focus:ring-brand w-4 h-4"
                      />
                      <div>
                        <span className="font-bold text-sm text-gray-900 block">
                          Cash on Delivery (COD)
                        </span>
                        <span className="text-xs text-gray-500">
                          Pay in cash when your order arrives at your door.
                        </span>
                      </div>
                    </div>
                  </label>

                  {/* Option 3: Bank Transfer */}
                  <label
                    className={`block p-4 rounded-lg border-2 cursor-pointer transition ${
                      formData.paymentMethod === 'bank_transfer'
                        ? 'border-brand bg-teal-50/30'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bank_transfer"
                        checked={formData.paymentMethod === 'bank_transfer'}
                        onChange={handleInputChange}
                        className="text-brand focus:ring-brand w-4 h-4"
                      />
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        <div>
                          <span className="font-bold text-sm text-gray-900 block">
                            Direct Bank Wire Transfer
                          </span>
                          <span className="text-xs text-gray-500">
                            Transfer directly to our corporate verified account.
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Shipping</span>
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition shadow-xs"
                    >
                      <span>Review Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: ORDER REVIEW & PLACE ORDER */}
            {step === 3 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand" />
                  <span>3. Review & Complete Order</span>
                </h2>

                {/* Shipping & Payment Summary Recap */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                  <div>
                    <h5 className="font-bold text-gray-900 mb-1">Delivering to:</h5>
                    <p className="font-semibold text-gray-800">{formData.firstName} {formData.lastName}</p>
                    <p className="text-gray-600">{formData.addressLine1}{formData.addressLine2 ? `, ${formData.addressLine2}` : ''}</p>
                    <p className="text-gray-600">{formData.city}, {formData.state} {formData.postalCode}</p>
                    <p className="text-gray-600">{formData.country}</p>
                    <p className="text-gray-600">{formData.phone}</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 mb-1">Payment Method:</h5>
                    <p className="font-semibold text-gray-800 capitalize">
                      {formData.paymentMethod === 'credit_card'
                        ? 'Sandbox Credit Card (Simulated)'
                        : formData.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Items in Checkout */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-gray-900">Ordered Items ({cart.items.length})</h4>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                    {cart.items.map((i) => (
                      <div key={i.id} className="p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={i.product.images?.[0]?.image_url || '/placeholder-product.svg'}
                            alt={i.product.title}
                            className="w-12 h-14 object-cover rounded border border-gray-200 shrink-0"
                          />
                          <div>
                            <h5 className="text-xs font-bold text-gray-900 line-clamp-1">{i.product.title}</h5>
                            <span className="text-[11px] text-gray-500">Qty: {i.quantity}</span>
                          </div>
                        </div>
                        <Price
                          amount={unitPrice(i) * i.quantity}
                          className="text-xs font-bold text-brand shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center justify-between border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('checkout.backToPayment')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 bg-brand hover:bg-brand-dark text-white rounded text-sm font-extrabold transition shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>{t('checkout.processing')}</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t('checkout.placeOrderNow')} ({formatPrice(total)})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Summary Box (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-lg border border-gray-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 pb-3 border-b border-gray-100">
              {t('checkout.orderBreakdown')}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>{t('cart.subtotal')}</span>
                <Price amount={subtotal} className="font-bold text-gray-900" />
              </div>

              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-teal-700 font-semibold">
                  <span>{t('cart.discount')}</span>
                  <span>-<Price amount={couponDiscount} /></span>
                </div>
              )}

              {couponProblem && (
                <div
                  role={couponProblem.hard ? 'alert' : 'status'}
                  aria-live="polite"
                  className={`p-2.5 rounded-md border text-[11px] leading-snug flex items-start gap-1.5 ${
                    couponProblem.hard
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <Info className={`w-4 h-4 shrink-0 mt-0.5 ${couponProblem.hard ? 'text-rose-600' : 'text-gray-500'}`} />
                  <span className="flex-1">{couponProblem.message}</span>
                  {couponProblem.hard && (
                    <button
                      type="button"
                      onClick={() => setCouponRetry((n) => n + 1)}
                      className="shrink-0 font-bold underline hover:text-rose-900"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-gray-600">
                <span>{t('cart.shipping')}</span>
                <span>{shippingFee === 0 ? <strong className="text-emerald-600">{t('common.free')}</strong> : <Price amount={shippingFee} />}</span>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="font-bold text-gray-900">{t('cart.total')}</span>
                <Price amount={total} className="text-xl font-extrabold text-brand" />
              </div>

              {/* Currency Transparency Notice */}
              {currency !== 'USD' && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800 flex items-start gap-1.5 leading-snug">
                  <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Amounts are converted from USD for display; the order total is{' '}
                    <strong>{formatPrice(total, 'USD')}</strong>.
                    {rateSource === 'approximate' && (
                      <>
                        {' '}The {currency} rate could not be fetched, so the converted figure is an
                        approximation from the bundled table, not today&apos;s market rate.
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>
                  {shippingFee === 0
                    ? `Free shipping applied (orders over ${formatPrice(rules.free_shipping_threshold)})`
                    : `Free shipping on orders over ${formatPrice(rules.free_shipping_threshold)}`}
                </span>
              </div>
              {formData.paymentMethod === 'credit_card' && (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Card payment is simulated: the order is recorded, no money moves</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
