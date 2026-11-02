'use client';

import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

const EMPTY = { name: '', email: '', subject: '', message: '' };

export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim() || null,
          message: form.message.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setForm(EMPTY);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The message was not saved.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-center space-y-2">
        <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
        <h4 className="font-bold text-sm">Message saved.</h4>
        <p className="text-xs text-emerald-700">
          Your inquiry is stored in the support queue. An administrator reads it from the admin
          console.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-2 px-4 py-2 border border-emerald-300 rounded text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Your Name *</label>
          <input
            type="text"
            required
            minLength={2}
            maxLength={120}
            placeholder="e.g. John Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
          <input
            type="email"
            required
            maxLength={160}
            placeholder="e.g. john@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
        <input
          type="text"
          maxLength={200}
          placeholder="e.g. Vendor Inquiry or Order Question"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Your Message *</label>
        <textarea
          rows={5}
          required
          minLength={10}
          maxLength={4000}
          placeholder="Describe your inquiry with all relevant details..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
        />
      </div>

      {error && <p className="text-xs font-bold text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        <span>{busy ? 'Sending…' : 'Send Message'}</span>
      </button>
    </form>
  );
}
