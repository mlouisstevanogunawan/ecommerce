'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, CheckCircle, AlertCircle } from 'lucide-react';
import type { SiteSettings } from '@/lib/types';

type Notice = { kind: 'ok' | 'err'; text: string } | null;

// Declared at module scope: defining a component inside the render body would
// remount the input on every keystroke and steal focus.
function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  hint,
  required,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1">
        {label}
        {required && ' *'}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-brand font-medium"
      />
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export function AdminSettingsManager({ settings: initial }: { settings: SiteSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    site_title: initial.site_title,
    site_description: initial.site_description,
    contact_email: initial.contact_email,
    contact_phone: initial.contact_phone,
    address: initial.address,
    facebook_url: initial.facebook_url ?? '',
    instagram_url: initial.instagram_url ?? '',
    twitter_url: initial.twitter_url ?? '',
    youtube_url: initial.youtube_url ?? '',
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setNotice({ kind: 'ok', text: 'Site settings saved.' });
      router.refresh();
    } catch (err: unknown) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'The settings were not saved.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand" />
          <span>Site Settings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          These values feed the browser tab title, the footer and the contact page.
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

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
        <TextField
          id="site_title"
          label="Site title"
          value={form.site_title}
          onChange={(v) => set('site_title', v)}
          required
          maxLength={120}
        />
        <TextField
          id="site_description"
          label="Site description"
          value={form.site_description}
          onChange={(v) => set('site_description', v)}
          required
          maxLength={500}
          hint="Used as the meta description and shown on the about page."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <TextField
            id="contact_email"
            label="Contact email"
            type="email"
            value={form.contact_email}
            onChange={(v) => set('contact_email', v)}
            required
            maxLength={200}
          />
          <TextField
            id="contact_phone"
            label="Contact phone"
            value={form.contact_phone}
            onChange={(v) => set('contact_phone', v)}
            required
            maxLength={40}
          />
        </div>

        <TextField
          id="address"
          label="Business address"
          value={form.address}
          onChange={(v) => set('address', v)}
          required
          maxLength={300}
        />

        <div className="pt-2 border-t border-slate-100 space-y-4">
          <p className="text-[11px] text-slate-400">
            Social profiles: leave a field empty and the footer hides that icon instead of linking to somebody
            else&apos;s page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField id="facebook_url" label="Facebook URL" value={form.facebook_url} onChange={(v) => set('facebook_url', v)} maxLength={2000} />
            <TextField id="instagram_url" label="Instagram URL" value={form.instagram_url} onChange={(v) => set('instagram_url', v)} maxLength={2000} />
            <TextField id="twitter_url" label="Twitter URL" value={form.twitter_url} onChange={(v) => set('twitter_url', v)} maxLength={2000} />
            <TextField id="youtube_url" label="YouTube URL" value={form.youtube_url} onChange={(v) => set('youtube_url', v)} maxLength={2000} />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
