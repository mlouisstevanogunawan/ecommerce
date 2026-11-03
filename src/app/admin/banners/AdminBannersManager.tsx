'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner, BannerPlacement, Category } from '@/lib/types';
import { CheckCircle, AlertCircle, Images, Plus, Pencil, Trash2 } from 'lucide-react';
import { ImageUpload } from '@/components/forms/ImageUpload';

type Notice = { kind: 'ok' | 'err'; text: string } | null;

const PLACEMENTS: { value: BannerPlacement; label: string }[] = [
  { value: 'hero', label: 'Hero carousel (homepage top)' },
  { value: 'promo_two', label: 'Two-column promo strip' },
  { value: 'promo_three', label: 'Three-column promo strip' },
  { value: 'category_showcase', label: 'Category showcase panel' },
];

const BLANK = {
  id: '',
  placement: 'hero' as BannerPlacement,
  category_id: '',
  title: '',
  subtitle: '',
  button_text: '',
  link_url: '',
  image_url: '',
  background_color: '',
  sort_order: 0,
  is_active: true,
};

type Draft = typeof BLANK;

function toDraft(banner: Banner): Draft {
  return {
    id: banner.id,
    placement: banner.placement,
    category_id: banner.category_id ?? '',
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    button_text: banner.button_text ?? '',
    link_url: banner.link_url,
    image_url: banner.image_url ?? '',
    background_color: banner.background_color ?? '',
    sort_order: banner.sort_order,
    is_active: banner.is_active,
  };
}

export function AdminBannersManager({
  banners: initial,
  categories,
}: {
  banners: Banner[];
  categories: Category[];
}) {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>(initial);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  const flatCategories = categories.flatMap((c) => [c, ...(c.children ?? [])]);

  const set = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id || undefined,
          placement: draft.placement,
          category_id: draft.placement === 'category_showcase' ? draft.category_id : null,
          title: draft.title.trim(),
          subtitle: draft.subtitle.trim() || null,
          button_text: draft.button_text.trim() || null,
          link_url: draft.link_url.trim(),
          image_url: draft.image_url.trim() || null,
          background_color: draft.background_color.trim() || null,
          sort_order: Number(draft.sort_order) || 0,
          is_active: draft.is_active,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }

      const saved = json.banner as Banner;
      setBanners((prev) =>
        prev.some((b) => b.id === saved.id) ? prev.map((b) => (b.id === saved.id ? saved : b)) : [...prev, saved],
      );
      setDraft(BLANK);
      setNotice({ kind: 'ok', text: `Banner "${saved.title}" saved.` });
      router.refresh();
    } catch (err: unknown) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The banner was not saved.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(banner: Banner) {
    if (!confirm(`Delete banner "${banner.title}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/banners?id=${encodeURIComponent(banner.id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
      if (draft.id === banner.id) setDraft(BLANK);
      setNotice({ kind: 'ok', text: 'Banner removed.' });
      router.refresh();
    } catch (err: unknown) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The banner was not removed.' });
    } finally {
      setSaving(false);
    }
  }

  const field =
    'w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-brand font-medium';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Images className="w-5 h-5 text-brand" />
          <span>Homepage Banners</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Every marketing slide on the homepage. An empty placement simply renders nothing on the storefront.
        </p>
      </div>

      {notice && (
        <div
          className={`p-3 rounded text-xs font-semibold flex items-center gap-2 border ${
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            {draft.id ? 'Edit Banner' : 'Add Banner'}
          </h3>

          <div>
            <label htmlFor="banner-placement" className="block text-xs font-bold text-slate-700 mb-1">Placement *</label>
            <select
              id="banner-placement"
              value={draft.placement}
              onChange={(e) => set({ placement: e.target.value as BannerPlacement })}
              className={`${field} bg-white`}
            >
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {draft.placement === 'category_showcase' && (
            <div>
              <label htmlFor="banner-category" className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
              <select
                id="banner-category"
                value={draft.category_id}
                onChange={(e) => set({ category_id: e.target.value })}
                className={`${field} bg-white`}
                required
              >
                <option value="">Choose a category…</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="banner-title" className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
            <input
              id="banner-title"
              type="text"
              required
              minLength={1}
              maxLength={160}
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="banner-subtitle" className="block text-xs font-bold text-slate-700 mb-1">Subtitle</label>
            <input
              id="banner-subtitle"
              type="text"
              maxLength={240}
              value={draft.subtitle}
              onChange={(e) => set({ subtitle: e.target.value })}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="banner-link" className="block text-xs font-bold text-slate-700 mb-1">Link *</label>
            <input
              id="banner-link"
              type="text"
              required
              maxLength={500}
              placeholder="/categories/clothing or https://…"
              value={draft.link_url}
              onChange={(e) => set({ link_url: e.target.value })}
              className={`${field} font-mono`}
            />
          </div>

          <div>
            <label htmlFor="banner-button" className="block text-xs font-bold text-slate-700 mb-1">Button text</label>
            <input
              id="banner-button"
              type="text"
              maxLength={40}
              value={draft.button_text}
              onChange={(e) => set({ button_text: e.target.value })}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="banner-image" className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
            <input
              id="banner-image"
              type="url"
              maxLength={2000}
              placeholder="https://…"
              value={draft.image_url}
              onChange={(e) => set({ image_url: e.target.value })}
              className={`${field} font-mono mb-2`}
            />
            <ImageUpload
              bucket="covers"
              value={draft.image_url}
              onChange={(url) => set({ image_url: url })}
              label="Upload banner image"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="banner-color" className="block text-xs font-bold text-slate-700 mb-1">Colour</label>
              <input
                id="banner-color"
                type="text"
                maxLength={7}
                placeholder="#222222"
                value={draft.background_color}
                onChange={(e) => set({ background_color: e.target.value })}
                className={`${field} font-mono`}
              />
            </div>
            <div className="w-24">
              <label htmlFor="banner-order" className="block text-xs font-bold text-slate-700 mb-1">Order</label>
              <input
                id="banner-order"
                type="number"
                min={0}
                max={10000}
                value={draft.sort_order}
                onChange={(e) => set({ sort_order: Number(e.target.value) })}
                className={field}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => set({ is_active: e.target.checked })}
              className="rounded border-slate-300 text-brand"
            />
            Active (visible on the storefront)
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>{draft.id ? 'Update Banner' : 'Create Banner'}</span>
            </button>
            {draft.id && (
              <button
                type="button"
                onClick={() => setDraft(BLANK)}
                className="px-3 py-2 border border-slate-300 rounded text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Saved Banners ({banners.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {banners.map((banner) => (
              <div key={banner.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-14 h-10 object-cover rounded border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div
                      className="w-14 h-10 rounded border border-slate-200 shrink-0"
                      style={{ backgroundColor: banner.background_color ?? '#e2e8f0' }}
                    />
                  )}
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate">{banner.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      {banner.placement}
                      {banner.category_id && ` · ${flatCategories.find((c) => c.id === banner.category_id)?.name ?? 'category removed'}`}
                      {` · ${banner.link_url}`}
                    </span>
                    {!banner.is_active && (
                      <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        hidden
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDraft(toDraft(banner))}
                    className="p-1.5 text-slate-400 hover:text-brand transition"
                    aria-label={`Edit ${banner.title}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDelete(banner)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition disabled:opacity-50"
                    aria-label={`Delete ${banner.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {banners.length === 0 && (
              <p className="p-4 text-xs text-slate-500">
                No banners yet. The homepage currently shows no marketing slides — that is intentional, not an error.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
