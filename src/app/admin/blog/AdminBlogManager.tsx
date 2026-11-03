'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Newspaper, Plus, Trash2, Pencil, CheckCircle, AlertCircle, X } from 'lucide-react';
import { ImageUpload } from '@/components/forms/ImageUpload';
import { slugify } from '@/lib/utils';
import type { BlogCategory, BlogPost } from '@/lib/types';

type Notice = { kind: 'ok' | 'err'; text: string } | null;

const EMPTY_POST = {
  id: null as string | null,
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  image_url: '',
  published: false,
  category_id: '',
};

const field = 'w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-brand';

export function AdminBlogManager({ posts: initialPosts, categories: initialCategories }: { posts: BlogPost[]; categories: BlogCategory[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState({ ...EMPTY_POST });
  const [slugTouched, setSlugTouched] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  const editing = draft.id !== null;
  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  function set<K extends keyof typeof EMPTY_POST>(key: K, value: (typeof EMPTY_POST)[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(post: BlogPost) {
    setDraft({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content,
      image_url: post.image_url ?? '',
      published: post.published,
      category_id: post.category_id,
    });
    setSlugTouched(true);
    setNotice(null);
  }

  async function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setSaving(true);
    setNotice(null);
    try {
      const { ok, message } = await action();
      setNotice({ kind: ok ? 'ok' : 'err', text: message });
      if (ok) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = editing;
    void run(async () => {
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id ?? undefined,
          title: draft.title,
          slug: draft.slug.trim(),
          content: draft.content,
          excerpt: draft.excerpt,
          image_url: draft.image_url,
          published: draft.published,
          category_id: draft.category_id,
        }),
      });
      const body = await res.json();
      if (!res.ok) return { ok: false, message: body?.error ?? 'Could not save the post.' };

      const saved = body.post as BlogPost;
      setPosts((prev) => (isEdit ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]));
      setDraft({ ...EMPTY_POST, category_id: draft.category_id });
      setSlugTouched(false);
      return { ok: true, message: isEdit ? 'Post updated.' : 'Post created.' };
    });
  }

  function handleDelete(post: BlogPost) {
    if (!confirm(`Delete "${post.title}"? Shoppers lose the page at /blog/${post.slug}.`)) return;
    void run(async () => {
      const res = await fetch(`/api/admin/blog?id=${post.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) return { ok: false, message: body?.error ?? 'Could not delete the post.' };
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      return { ok: true, message: `Deleted "${post.title}".` };
    });
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    void run(async () => {
      const res = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory }),
      });
      const body = await res.json();
      if (!res.ok) return { ok: false, message: body?.error ?? 'Could not create the category.' };
      setCategories((prev) => [...prev, body.category as BlogCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft((prev) => (prev.category_id ? prev : { ...prev, category_id: (body.category as BlogCategory).id }));
      setNewCategory('');
      return { ok: true, message: `Category "${(body.category as BlogCategory).name}" created.` };
    });
  }

  function handleDeleteCategory(category: BlogCategory) {
    if (!confirm(`Delete "${category.name}"? Its ${category.post_count} post(s) are deleted with it.`)) return;
    void run(async () => {
      const res = await fetch(`/api/admin/blog/categories?id=${category.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) return { ok: false, message: body?.error ?? 'Could not delete the category.' };
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      setPosts((prev) => prev.filter((p) => p.category_id !== category.id));
      return { ok: true, message: `Deleted "${category.name}" and its ${category.post_count} post(s).` };
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-brand" />
          <span>Blog Management</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Drafts stay hidden from shoppers until published. Slugs are permanent addresses:
          {' /blog/&lt;slug&gt; '}.
        </p>
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
            notice.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {notice.kind === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-3">Categories</h2>
            {categories.length === 0 ? (
              <p className="text-xs text-slate-500 mb-3">No blog categories yet. Create one before writing a post.</p>
            ) : (
              <ul className="space-y-2 mb-3">
                {sortedCategories.map((category) => (
                  <li key={category.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800">
                      {category.name}{' '}
                      <span className="text-slate-400">({category.post_count} post{category.post_count === 1 ? '' : 's'})</span>
                    </span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDeleteCategory(category)}
                      aria-label={`Delete category ${category.name}`}
                      className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-amber-700 mb-3">
              Deleting a category also deletes the posts inside it — that is how the database is wired.
            </p>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Buying guides"
                aria-label="New blog category name"
                className={field}
              />
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-2 bg-brand text-white rounded text-xs font-bold hover:bg-brand-dark transition disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </section>

          <section className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-3">
              {editing ? 'Edit post' : 'New post'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Title *</span>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={200}
                  value={draft.title}
                  onChange={(e) => {
                    set('title', e.target.value);
                    if (!slugTouched) set('slug', slugify(e.target.value));
                  }}
                  className={field}
                />
              </label>

              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Slug *</span>
                <input
                  type="text"
                  required
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  maxLength={220}
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', e.target.value);
                  }}
                  className={`${field} font-mono`}
                />
              </label>

              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Category *</span>
                <select
                  required
                  value={draft.category_id}
                  onChange={(e) => set('category_id', e.target.value)}
                  className={`${field} bg-white`}
                >
                  <option value="">Choose a category</option>
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Excerpt (optional)</span>
                <textarea
                  rows={2}
                  maxLength={400}
                  value={draft.excerpt}
                  onChange={(e) => set('excerpt', e.target.value)}
                  className={field}
                />
              </label>

              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Content *</span>
                <textarea
                  rows={8}
                  required
                  minLength={20}
                  maxLength={60000}
                  value={draft.content}
                  onChange={(e) => set('content', e.target.value)}
                  placeholder="Write the article. Blank lines separate paragraphs."
                  className={field}
                />
              </label>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">Cover image (optional)</span>
                <ImageUpload bucket="blog" value={draft.image_url} onChange={(url) => set('image_url', url)} label="Upload blog cover image" />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => set('published', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span>Published (visible in /blog)</span>
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving || categories.length === 0}
                  className="flex-1 py-2 bg-brand text-white rounded text-xs font-bold hover:bg-brand-dark transition disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editing ? 'Update post' : 'Create post'}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({ ...EMPTY_POST });
                      setSlugTouched(false);
                    }}
                    aria-label="Stop editing this post"
                    className="px-3 py-2 rounded border border-slate-300 text-slate-600 hover:text-brand"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>

        <section className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Posts ({posts.length})
            </h2>
          </div>

          {posts.length === 0 ? (
            <div className="p-10 text-center">
              <Newspaper className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-slate-800 mb-1">No articles yet</h3>
              <p className="text-xs text-slate-500">Create a category, then write the first post on the left.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {posts.map((post) => (
                <li key={post.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{post.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                          post.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {post.published ? 'published' : 'draft'}
                      </span>{' '}
                      /blog/{post.slug} · {post.category?.name ?? 'no category'} ·{' '}
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                    {post.excerpt ? <p className="text-xs text-slate-600 mt-1 line-clamp-2">{post.excerpt}</p> : null}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {post.published && (
                      <Link
                        href={`/blog/${post.slug}`}
                        className="p-2 rounded border border-slate-200 text-slate-500 hover:text-brand hover:border-brand"
                        aria-label={`Open ${post.title}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => startEdit(post)}
                      className="p-2 rounded border border-slate-200 text-slate-500 hover:text-brand hover:border-brand disabled:opacity-50"
                      aria-label={`Edit ${post.title}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDelete(post)}
                      className="p-2 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                      aria-label={`Delete ${post.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
