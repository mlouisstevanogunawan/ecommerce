'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, AlertCircle, ImageIcon } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { ImageUpload } from '@/components/forms/ImageUpload';

interface CategoryOption {
  id: string;
  label: string;
}

const MONEY_LIMIT = 99999999;

export function NewProductForm({
  categories,
  hasStore,
  storeTitle,
}: {
  categories: CategoryOption[];
  hasStore: boolean;
  storeTitle: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    category_id: categories[0]?.id ?? '',
    price: '',
    discount_rate: '0',
    stock: '',
    sku: '',
    description: '',
    imageUrl: '',
    status: 'draft',
    is_digital: false,
    is_featured: false,
    is_special_offer: false,
  });

  // The suggested SKU is generated in the browser only after mount: putting
  // Date.now() in the initial state would make the server and client render
  // different values into the same input.
  useEffect(() => {
    set('sku', `SKU-${Date.now().toString(36).toUpperCase()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceNum = Number.parseFloat(form.price);
  const discountNum = Number.parseFloat(form.discount_rate);
  const validPrice = Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : 0;
  const validDiscount = Number.isFinite(discountNum) ? Math.min(Math.max(discountNum, 0), 100) : 0;
  const discountedPrice = Math.round(validPrice * (1 - validDiscount / 100) * 100) / 100;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Please provide a product title');
      return;
    }
    if (!form.category_id) {
      setError('Choose a category. Ask an admin to add one if the list is empty.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          slug: `${slugify(form.title) || 'product'}-${Date.now().toString().slice(-4)}`,
          sku: form.sku.trim(),
          description: form.description.trim(),
          category_id: form.category_id,
          price: validPrice,
          discount_rate: Math.round(validDiscount),
          stock: Number.parseInt(form.stock, 10) || 0,
          is_digital: form.is_digital,
          is_featured: form.is_featured,
          is_special_offer: form.is_special_offer,
          status: form.status,
          image_url: form.imageUrl.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      router.push('/seller/products');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The product was not saved.');
      setSubmitting(false);
    }
  }

  if (!hasStore) {
    return (
      <div className="p-6 sm:p-8">
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs font-semibold space-y-3">
          <p>You need a store before you can list products.</p>
          <Link
            href="/seller/store-settings"
            className="inline-flex px-4 py-2 bg-brand text-white rounded text-xs font-bold hover:bg-brand-dark transition"
          >
            Open your store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          Product Title * <span className="font-normal text-gray-400">(for {storeTitle})</span>
        </label>
        <input
          type="text"
          required
          minLength={3}
          maxLength={160}
          placeholder="Name of the product you are listing"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand font-medium"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
          <select
            required
            value={form.category_id}
            onChange={(e) => set('category_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand bg-white font-medium"
          >
            {categories.length === 0 ? <option value="">No categories yet</option> : null}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">SKU / Code *</label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={60}
            value={form.sku}
            onChange={(e) => set('sku', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Regular Price (USD) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={MONEY_LIMIT}
            required
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Discount Rate (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={form.discount_rate}
            onChange={(e) => set('discount_rate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Stock Quantity *</label>
          <input
            type="number"
            min="0"
            required
            value={form.stock}
            onChange={(e) => set('stock', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="p-3 bg-teal-50 border border-teal-200 rounded text-xs text-teal-900 font-semibold flex items-center justify-between">
        <span>Customer will pay:</span>
        <span className="text-base font-bold text-brand">${discountedPrice.toFixed(2)}</span>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Primary Image URL</label>
        <div className="flex gap-4 items-start">
          <div className="w-20 h-24 rounded border border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div className="flex-grow space-y-2">
            <ImageUpload
              bucket="products"
              value={form.imageUrl}
              onChange={(url) => set('imageUrl', url)}
              label="Upload product image"
            />
            <input
              type="url"
              placeholder="https://…"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand font-mono"
            />
            <span className="text-[11px] text-gray-400 block">
              Upload stores the file in the Supabase Storage <code>products</code> bucket. The URL field is filled in by the upload and can be edited only to point at a file you already own.
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Description *</label>
        <textarea
          rows={4}
          required
          minLength={10}
          maxLength={20000}
          placeholder="Describe product materials, dimensions, care instructions, and styling tips…"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_special_offer}
            onChange={(e) => set('is_special_offer', e.target.checked)}
            className="rounded border-gray-300 text-brand focus:ring-brand w-4 h-4"
          />
          <span className="text-xs font-bold text-gray-700">Special Offer Deal</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => set('is_featured', e.target.checked)}
            className="rounded border-gray-300 text-brand focus:ring-brand w-4 h-4"
          />
          <span className="text-xs font-bold text-gray-700">Featured Listing</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_digital}
            onChange={(e) => set('is_digital', e.target.checked)}
            className="rounded border-gray-300 text-brand focus:ring-brand w-4 h-4"
          />
          <span className="text-xs font-bold text-gray-700">Digital Product</span>
        </label>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand bg-white font-medium"
          >
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published (live)</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
        <Link
          href="/seller/products"
          className="px-5 py-2 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition shadow-xs disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{submitting ? 'Saving…' : form.status === 'published' ? 'Publish Product' : 'Save Draft'}</span>
        </button>
      </div>
    </form>
  );
}
