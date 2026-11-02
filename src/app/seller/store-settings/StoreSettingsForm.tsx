'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, Save, CheckCircle, AlertCircle } from 'lucide-react';
import type { Store } from '@/lib/types';

type Notice = { kind: 'ok' | 'err'; text: string } | null;

function initial(store: Store | null) {
  return {
    title: store?.title ?? '',
    slug: store?.slug ?? '',
    description: store?.description ?? '',
    phone: store?.phone ?? '',
    address: store?.address ?? '',
    logo_url: store?.logo_url ?? '',
    cover_url: store?.cover_url ?? '',
  };
}

export function StoreSettingsForm({ store }: { store: Store | null }) {
  const router = useRouter();
  const [form, setForm] = useState(initial(store));
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/seller/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug.trim() || undefined,
          description: form.description.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          logo_url: form.logo_url.trim() || null,
          cover_url: form.cover_url.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      const saved = json.store as Store;
      setForm(initial(saved));
      setNotice({ kind: 'ok', text: `Store saved. Public URL: /profile/${saved.slug}` });
      router.refresh();
    } catch (err: unknown) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The store was not saved.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand" />
          <span>Store Settings &amp; Profile</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Customize your vendor storefront branding, contact information, and banner display.
        </p>
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

      {!store && (
        <p className="mx-6 mt-6 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs font-semibold">
          You have not opened a store yet. Filling this form creates it; until then you cannot list products.
        </p>
      )}

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Store Name *</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Store URL Slug *</label>
            <input
              type="text"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={140}
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand font-mono"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Lowercase letters, numbers and dashes. Unique across the platform.
              {store ? (
                <>
                  {' '}
                  Current page:{' '}
                  <Link href={`/profile/${store.slug}`} target="_blank" className="text-brand hover:underline">
                    /profile/{store.slug}
                  </Link>
                </>
              ) : null}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Store Bio / Description</label>
          <textarea
            rows={3}
            maxLength={4000}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Contact Phone</label>
            <input
              type="text"
              maxLength={30}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Physical Location</label>
            <input
              type="text"
              maxLength={300}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Store Avatar URL</label>
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="avatar" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <input
                type="url"
                placeholder="https://…"
                value={form.logo_url}
                onChange={(e) => set('logo_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Cover Banner URL</label>
            <div className="flex gap-3 items-center">
              <div className="w-20 h-12 rounded overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                {form.cover_url ? (
                  <img src={form.cover_url} alt="cover" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <input
                type="url"
                placeholder="https://…"
                value={form.cover_url}
                onChange={(e) => set('cover_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-4">
          <span className="text-[11px] text-gray-400">
            {store
              ? store.is_verified
                ? 'This store is verified by the platform team.'
                : 'Verification status is set by platform admins.'
              : 'No store created yet.'}
          </span>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition shadow-xs disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving…' : store ? 'Save Store Settings' : 'Create My Store'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
