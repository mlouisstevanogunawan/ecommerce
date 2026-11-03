'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  ShoppingCart,
  Star,
  ShieldCheck,
  Truck,
  MessageCircle,
  HelpCircle,
  Share2,
  Check,
  Send,
  UserCheck,
  ImageIcon,
} from 'lucide-react';
import { Product, ProductVariant, ProductReview } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Price } from '@/components/currency/Price';
import { effectivePrice } from '@/lib/pricing';
import { useCart } from '@/components/cart/CartProvider';

interface ProductDetailViewProps {
  product: Product;
  reviews: ProductReview[];
  freeShippingThreshold: number;
  flatShippingFee: number;
}

export function ProductDetailView({
  product,
  reviews,
  freeShippingThreshold,
  flatShippingFee,
}: ProductDetailViewProps) {
  const router = useRouter();
  const { addToCart, toggleWishlist, isInWishlist, userId } = useCart();
  const inWishlist = isInWishlist(product.id);

  // Gallery State
  const images = (product.images ?? [])
    .slice()
    .sort((a, b) => (a.is_primary === b.is_primary ? a.sort_order - b.sort_order : a.is_primary ? -1 : 1))
    .map((img) => img.image_url)
    .filter((url): url is string => Boolean(url));

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Variants State
  const variants = product.variants || [];
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.length > 0 ? variants[0] : null
  );

  // Quantity State
  const [quantity, setQuantity] = useState(1);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'desc' | 'details' | 'shipping' | 'reviews'>('desc');

  // Question Modal State
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionDone, setQuestionDone] = useState(false);
  const [questionError, setQuestionError] = useState('');

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // products.reviews_count is maintained by the database trigger; the loaded
  // list is the fallback for a page rendered before that trigger ran.
  const ratingCount = product.reviews_count ?? reviews.length;

  const handleQuantityChange = (val: number) => {
    if (val < 1) return;
    if (val > product.stock) return;
    setQuantity(val);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariant);
  };

  async function handleQuestionSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = questionText.trim();
    if (!text) return;

    setQuestionBusy(true);
    setQuestionError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Question about ${product.title}`,
          message: text,
          product_id: product.id,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setQuestionDone(true);
      setQuestionText('');
    } catch (err: unknown) {
      setQuestionError(err instanceof Error ? err.message : 'Your question was not sent.');
    } finally {
      setQuestionBusy(false);
    }
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = reviewComment.trim();
    if (!text) return;

    setReviewBusy(true);
    setReviewNotice(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, rating: reviewRating, review_text: text }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setReviewComment('');
      setReviewNotice({ kind: 'ok', text: 'Thanks! Your review has been saved.' });
      // The list and the star average are rendered by the server component.
      router.refresh();
    } catch (err: unknown) {
      setReviewNotice({ kind: 'err', text: err instanceof Error ? err.message : 'Your review was not saved.' });
    } finally {
      setReviewBusy(false);
    }
  }

  // WhatsApp link generator. The page URL only exists in the browser, so it is
  // filled in after mount; reading window during render would make the server
  // and client markup disagree and React would discard the hydrated tree.
  const [pageUrl, setPageUrl] = useState('');
  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const sellerPhone = product.store?.phone?.replace(/[^0-9]/g, '') ?? '';
  const whatsappUrl = sellerPhone
    ? `https://wa.me/${sellerPhone}?text=${encodeURIComponent(
        `Hello, I am inquiring about "${product.title}" listed on Modesy (${pageUrl})`
      )}`
    : null;

  return (
    <div className="bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-12">
        {/* Left Column: Image Gallery (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Large Image */}
          <div className="relative aspect-3/4 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-xs group">
            {images.length > 0 ? (
              <img
                src={images[Math.min(activeImageIndex, images.length - 1)]}
                alt={product.title}
                className="w-full h-full object-cover object-center transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                <ImageIcon className="w-10 h-10" />
                <span className="text-xs font-semibold">No image uploaded yet</span>
              </div>
            )}
            {product.discount_rate > 0 && (
              <span className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded shadow-xs">
                -{product.discount_rate}%
              </span>
            )}
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-18 h-22 rounded border-2 overflow-hidden shrink-0 transition-all ${
                    activeImageIndex === idx
                      ? 'border-brand shadow-xs'
                      : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Actions (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
              {product.title}
            </h1>

            {/* Vendor & Rating Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Sold by:</span>
                {product.store?.slug ? (
                  <Link
                    href={`/profile/${product.store.slug}`}
                    className="font-bold text-brand hover:underline flex items-center gap-1"
                  >
                    <span>{product.store.title}</span>
                    {product.store.is_verified && (
                      <UserCheck className="w-4 h-4 text-emerald-600 inline" />
                    )}
                  </Link>
                ) : (
                  <span className="font-bold text-gray-800">
                    {product.store?.title ?? 'Unknown vendor'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(product.rating ?? 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-800 text-xs">
                  {ratingCount > 0
                    ? `${(product.rating ?? 0).toFixed(2)} (${ratingCount} ${ratingCount === 1 ? 'review' : 'reviews'})`
                    : 'No reviews yet'}
                </span>
              </div>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200/80 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-brand">
                    <Price amount={effectivePrice(selectedVariant, product)} />
                  </span>
                  {product.discount_rate > 0 && (
                    <del className="text-sm text-gray-400 font-medium">
                      <Price amount={product.price} />
                    </del>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tax included.
                  {freeShippingThreshold > 0 ? (
                    <>Free shipping on orders over <Price amount={freeShippingThreshold} />.</>
                  ) : (
                    <>Shipping is free on every order.</>
                  )}
                </p>
              </div>

              <div className="text-right">
                {product.stock > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    <Check className="w-3.5 h-3.5" /> In Stock ({product.stock})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                    Out of Stock
                  </span>
                )}
                <div className="text-[11px] text-gray-400 mt-1 font-mono">SKU: {product.sku}</div>
              </div>
            </div>

            {/* Interactive Variants Selector */}
            {variants.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Options / Variants
                  </label>
                  <span className="text-xs text-gray-500">
                    Selected: <span className="font-bold text-gray-800">{selectedVariant?.name}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3.5 py-1.5 rounded text-xs font-semibold border transition-all ${
                        selectedVariant?.id === v.id
                          ? 'border-brand bg-teal-50 text-brand ring-2 ring-brand/20'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector & Action Buttons */}
            <div className="pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Quantity Control */}
                <div className="flex items-center border border-gray-300 rounded-md bg-white w-32 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="w-10 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    min="1"
                    max={product.stock}
                    className="w-12 text-center text-sm font-bold text-gray-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= product.stock}
                    className="w-10 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className="flex-grow flex items-center justify-center gap-2 py-3 px-6 bg-brand hover:bg-brand-dark text-white font-bold rounded-md shadow-sm transition transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Add to Cart</span>
                </button>

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={`w-12 h-11 flex items-center justify-center rounded-md border transition shrink-0 ${
                    inWishlist
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                  }`}
                  title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-5 h-5 ${inWishlist ? 'fill-rose-600 text-rose-600' : ''}`} />
                </button>
              </div>

              {/* Vendor Direct Actions: WhatsApp & Ask Question */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat via WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setIsQuestionOpen(true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded transition"
                >
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                  <span>Ask a Question</span>
                </button>
              </div>
            </div>

            {/* Store facts — each line is backed by checkout_rules() or the product row */}
            <div className="pt-6 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
              <div className="flex flex-col items-center gap-1">
                <Truck className="w-4 h-4 text-brand" />
                <span>
                  Free shipping over <Price amount={freeShippingThreshold} />
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <MessageCircle className="w-4 h-4 text-brand" />
                <span>Ask this vendor a question</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-brand" />
                <span>Stock re-checked when you order</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="pt-8 border-t border-gray-200">
        <div className="flex items-center gap-4 border-b border-gray-200 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('desc')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'desc'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Description
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'details'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Product Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'shipping'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Shipping & Location
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Customer Reviews ({ratingCount})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="py-6">
          {activeTab === 'desc' && (
            <div className="text-sm text-gray-700 leading-relaxed space-y-4 max-w-4xl">
              <p>{product.description}</p>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="max-w-2xl">
              <table className="w-full text-xs text-left border border-gray-200 rounded-lg overflow-hidden">
                <tbody>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="py-2.5 px-4 font-bold text-gray-700 w-1/3">SKU</td>
                    <td className="py-2.5 px-4 text-gray-800 font-mono">{product.sku}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2.5 px-4 font-bold text-gray-700">Category</td>
                    <td className="py-2.5 px-4 text-gray-800">{product.category?.name ?? 'No category set'}</td>
                  </tr>
                  {product.details &&
                    Object.entries(product.details).map(([k, v]) => (
                      <tr key={k} className="border-b border-gray-100">
                        <td className="py-2.5 px-4 font-bold text-gray-700">{k}</td>
                        <td className="py-2.5 px-4 text-gray-800">{String(v)}</td>
                      </tr>
                    ))}
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-gray-700">Product type</td>
                    <td className="py-2.5 px-4 text-gray-800">
                      {product.is_digital ? 'Digital download' : 'Physical item'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="text-xs text-gray-700 space-y-3 max-w-2xl">
              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <h5 className="font-bold text-sm text-gray-900 mb-1">Shipping Rates</h5>
                <p className="font-semibold text-emerald-700">
                  {freeShippingThreshold > 0 ? (
                    <>Free on orders over <Price amount={freeShippingThreshold} />.</>
                  ) : (
                    <>Shipping is free on every order.</>
                  )}
                </p>
                {freeShippingThreshold > 0 && (
                  <p className="text-gray-500 mt-1">
                    Below that, a flat <Price amount={flatShippingFee} /> applies at checkout.
                  </p>
                )}
                <p className="text-gray-500 mt-1">
                  These figures come from the platform settings, so they match what checkout charges.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <h5 className="font-bold text-sm text-gray-900 mb-1">Store Location</h5>
                <p>{product.store?.address ?? 'The vendor has not shared a location.'}</p>
                <p className="text-gray-500 mt-1">Ships directly from vendor warehouse.</p>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-8 max-w-3xl">
              {/* Review Submission Form */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                <h4 className="font-bold text-sm text-gray-900 mb-3">Add Your Review</h4>
                {!userId ? (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <Link href="/login" className="font-bold text-brand hover:underline">
                      Sign in
                    </Link>{' '}
                    to review this product. The platform only accepts reviews from customers who
                    have purchased it.
                  </p>
                ) : (
                  <>
                    {reviewNotice && (
                      <div
                        className={`p-3 rounded text-xs font-semibold mb-4 ${
                          reviewNotice.kind === 'ok'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {reviewNotice.text}
                      </div>
                    )}
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Rating</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-1 text-amber-400 hover:scale-110 transition"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= reviewRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Your Feedback
                        </label>
                        <textarea
                          rows={3}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Write your honest experience with this product..."
                          className="w-full p-2.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={reviewBusy}
                        className="px-5 py-2 bg-brand text-white text-xs font-bold rounded hover:bg-brand-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {reviewBusy ? 'Submitting…' : 'Submit Review'}
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No customer reviews have been recorded for this product yet.
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-lg border border-gray-100 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-100 text-brand font-bold text-xs flex items-center justify-center">
                            {rev.user?.full_name?.[0] || 'U'}
                          </div>
                          <span className="font-bold text-xs text-gray-800">
                            {rev.user?.full_name || 'Customer'}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {formatDate(rev.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center text-amber-400 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{rev.review_text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ask Question Modal */}
      {isQuestionOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-scaleUp">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ask a Question</h3>
            <p className="text-xs text-gray-500 mb-4">
              Send an inquiry directly to {product.store?.title || 'the seller'}.
            </p>
            {!userId ? (
              <div className="p-4 bg-gray-50 rounded text-xs text-gray-700 leading-relaxed">
                <Link href="/login" className="font-bold text-brand hover:underline">
                  Sign in
                </Link>{' '}
                to send this question to the vendor. The inquiry is attached to your account so the
                seller can reply.
              </div>
            ) : questionDone ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded text-center text-xs font-semibold">
                Your message has been delivered to the vendor!
              </div>
            ) : (
              <form onSubmit={handleQuestionSubmit} className="space-y-4">
                <textarea
                  rows={4}
                  required
                  minLength={10}
                  maxLength={4000}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Ask about size, materials, delivery, custom orders..."
                  className="w-full p-3 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                />
                {questionError && (
                  <p className="text-xs font-semibold text-red-700">{questionError}</p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQuestionOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={questionBusy}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded text-xs font-bold hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{questionBusy ? 'Sending…' : 'Send Inquiry'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
