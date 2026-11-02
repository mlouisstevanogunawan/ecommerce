'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, PlusCircle, Trash2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Product, ProductStatus } from '@/lib/types';
import { Price } from '@/components/currency/Price';

const STATUSES: ProductStatus[] = ['draft', 'pending', 'published'];

type Notice = { kind: 'ok' | 'err'; text: string } | null;

export function SellerProductsTable({ products: initial }: { products: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initial);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeStatus(id: string, status: ProductStatus) {
    const previous = products;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    setBusyId(id);
    try {
      const res = await fetch('/api/seller/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setNotice({ kind: 'ok', text: `Listing is now "${status}".` });
      router.refresh();
    } catch (err: unknown) {
      setProducts(previous);
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The status was not saved.' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/seller/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setNotice({ kind: 'ok', text: `Product "${title}" deleted.` });
      router.refresh();
    } catch (err: unknown) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The product was not deleted.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand" />
            <span>Store Products Catalog ({products.length})</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your inventory, prices, status, and active listings.
          </p>
        </div>

        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Product</span>
        </Link>
      </div>

      {notice && (
        <div
          className={`mx-6 mt-6 p-3 rounded text-xs font-semibold flex items-center gap-2 border ${
            notice.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notice.kind === 'ok' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {products.length === 0 ? (
        <div className="p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-gray-800 mb-1">No products listed</h3>
          <p className="text-xs text-gray-500 mb-6">Start selling by adding your first product.</p>
          <Link
            href="/seller/products/new"
            className="px-5 py-2 bg-brand text-white text-xs font-bold rounded hover:bg-brand-dark transition"
          >
            Create Product
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-6">Product</th>
                <th className="py-3.5 px-6">SKU</th>
                <th className="py-3.5 px-6">Price</th>
                <th className="py-3.5 px-6">Stock</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/80 transition">
                  <td className="py-4 px-6 flex items-center gap-3">
                    {product.images?.[0]?.image_url ? (
                      <img
                        src={product.images[0].image_url}
                        alt={product.title}
                        className="w-12 h-14 object-cover rounded border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-14 rounded border border-gray-200 bg-gray-50 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 line-clamp-1 hover:text-brand transition">
                        {product.status === 'published' ? (
                          <Link href={`/${product.slug}`} target="_blank">
                            {product.title}
                          </Link>
                        ) : (
                          product.title
                        )}
                      </h4>
                      <span className="text-[11px] text-gray-400">
                        {product.category?.name ?? 'No category'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-gray-600">{product.sku}</td>
                  <td className="py-4 px-6 font-bold text-brand">
                    <Price amount={product.discounted_price} />
                  </td>
                  <td className="py-4 px-6">
                    {product.stock > 0 ? (
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {product.stock} in stock
                      </span>
                    ) : (
                      <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                        Out of stock
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <select
                      value={product.status}
                      disabled={busyId === product.id}
                      onChange={(e) => changeStatus(product.id, e.target.value as ProductStatus)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 bg-white focus:outline-none focus:border-brand font-medium capitalize disabled:opacity-50"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/${product.slug}`}
                        target="_blank"
                        className="p-1.5 text-gray-400 hover:text-brand transition"
                        title="View Live Listing"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(product.id, product.title)}
                        disabled={busyId === product.id}
                        className="p-1.5 text-gray-400 hover:text-rose-600 transition disabled:opacity-50"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
