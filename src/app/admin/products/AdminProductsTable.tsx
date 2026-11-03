'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Trash2, ExternalLink, Star, Flame } from 'lucide-react';
import { Product } from '@/lib/types';
import { Price } from '@/components/currency/Price';

type Notice = { kind: 'ok' | 'err'; text: string } | null;

export function AdminProductsTable({ products: initial }: { products: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initial);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patch(id: string, flags: { is_featured?: boolean; is_special_offer?: boolean }) {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...flags }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...flags } : p)));
      setNotice({ kind: 'ok', text: 'Catalog updated.' });
      router.refresh();
    } catch (err: unknown) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The update failed.' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Are you sure you want to remove this product from the platform?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setNotice({ kind: 'ok', text: 'Product removed.' });
      router.refresh();
    } catch (err: unknown) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The delete failed.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand" />
            <span>Product Catalog Moderation ({products.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit vendor listings, feature products on homepage carousels, or enforce compliance.
          </p>
        </div>
      </div>

      {notice && (
        <div
          className={`mx-6 mt-6 p-3 rounded text-xs font-semibold border ${
            notice.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-6">Product &amp; Vendor</th>
              <th className="py-3.5 px-6">Price</th>
              <th className="py-3.5 px-6">Stock</th>
              <th className="py-3.5 px-6 text-center">Featured</th>
              <th className="py-3.5 px-6 text-center">Special Offer</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50/80 transition">
                <td className="py-4 px-6 flex items-center gap-3">
                  {product.images?.[0]?.image_url ? (
                    <img
                      src={product.images[0].image_url}
                      alt={product.title}
                      className="w-11 h-14 object-cover rounded border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-14 rounded border border-slate-200 bg-slate-50 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 line-clamp-1 hover:text-brand transition">
                      <Link href={`/${product.slug}`} target="_blank">
                        {product.title}
                      </Link>
                    </h4>
                    <span className="text-[11px] text-brand font-semibold block">
                      Vendor: {product.store?.title ?? 'Unknown vendor'}
                    </span>
                    <span className="text-[11px] text-slate-400 block capitalize">
                      Status: {product.status}
                    </span>
                  </div>
                </td>

                <td className="py-4 px-6 font-bold text-brand">
                  <Price amount={product.discounted_price} />
                </td>

                <td className="py-4 px-6">
                  <span className="font-semibold text-slate-700">{product.stock} units</span>
                </td>

                <td className="py-4 px-6 text-center">
                  <button
                    type="button"
                    disabled={busyId === product.id}
                    onClick={() => patch(product.id, { is_featured: !product.is_featured })}
                    className={`p-1.5 rounded transition disabled:opacity-50 ${
                      product.is_featured
                        ? 'bg-amber-100 text-amber-700 font-bold'
                        : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                    }`}
                    title={product.is_featured ? 'Featured on Homepage' : 'Not Featured'}
                  >
                    <Star className={`w-4 h-4 ${product.is_featured ? 'fill-amber-500' : ''}`} />
                  </button>
                </td>

                <td className="py-4 px-6 text-center">
                  <button
                    type="button"
                    disabled={busyId === product.id}
                    onClick={() => patch(product.id, { is_special_offer: !product.is_special_offer })}
                    className={`p-1.5 rounded transition disabled:opacity-50 ${
                      product.is_special_offer
                        ? 'bg-rose-100 text-rose-700 font-bold'
                        : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                    }`}
                    title={product.is_special_offer ? 'In Special Offers Deals' : 'Not in Deals'}
                  >
                    <Flame className={`w-4 h-4 ${product.is_special_offer ? 'fill-rose-500' : ''}`} />
                  </button>
                </td>

                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/${product.slug}`}
                      target="_blank"
                      className="p-1.5 text-slate-400 hover:text-brand transition"
                      title="View Public Page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === product.id}
                      onClick={() => remove(product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition disabled:opacity-50"
                      title="Remove Listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 px-6 text-slate-500">
                  No products have been listed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
