'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Category } from '@/lib/types';
import { slugify } from '@/lib/utils';

type Notice = { kind: 'ok' | 'err'; text: string } | null;

export function AdminCategoriesManager({ categories: initial }: { categories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initial);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImg, setNewCatImg] = useState('');
  const [parentId, setParentId] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  const flat = useMemo(
    () => categories.flatMap((c) => [c, ...(c.children ?? [])]),
    [categories],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slugify(name),
          image_url: newCatImg.trim() || null,
          parent_id: parentId || null,
          sort_order: flat.length + 1,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }

      const created = json.category as Category;
      if (created.parent_id) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === created.parent_id
              ? { ...c, children: [...(c.children ?? []), created] }
              : c,
          ),
        );
      } else {
        setCategories((prev) => [...prev, { ...created, children: [] }]);
      }
      setNewCatName('');
      setNewCatImg('');
      setParentId('');
      setNotice({ kind: 'ok', text: `Category "${created.name}" saved.` });
      router.refresh();
    } catch (err: unknown) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The category was not saved.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setCategories((prev) =>
        prev
          .filter((c) => c.id !== id)
          .map((c) => ({ ...c, children: (c.children ?? []).filter((sub) => sub.id !== id) })),
      );
      setNotice({ kind: 'ok', text: `Category "${name}" removed.` });
      router.refresh();
    } catch (err: unknown) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The category was not removed.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand" />
          <span>Category Taxonomy Management</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Organize parent categories and subcategory hierarchies shown in the Mega Menu.
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
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-4">
            Add New Category
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="e.g. Health & Wellness"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-brand font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Parent (optional)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-brand font-medium bg-white"
              >
                <option value="">None — top level</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cover Image URL</label>
              <input
                type="url"
                placeholder="https://…"
                value={newCatImg}
                onChange={(e) => setNewCatImg(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-brand font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>Create Category</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Active Categories ({flat.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {flat.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-10 h-10 object-cover rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">
                      {cat.parent_id ? <span className="text-slate-400">↳ </span> : null}
                      {cat.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">/{cat.slug}</span>
                    {cat.children && cat.children.length > 0 && (
                      <span className="text-[11px] text-brand ml-2">
                        ({cat.children.length} subcategories)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/categories/${cat.slug}`}
                    target="_blank"
                    className="text-xs text-brand hover:underline font-semibold"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {flat.length === 0 && (
              <p className="p-4 text-xs text-slate-500">
                No categories yet. Add one so sellers can list products under it.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
