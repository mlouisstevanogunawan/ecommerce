'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, MapPin, Pencil, Plus, Star, Trash2, User, X } from 'lucide-react';
import { ImageUpload } from '@/components/forms/ImageUpload';
import type { Profile, UserAddress } from '@/lib/types';

type Notice = { kind: 'ok' | 'err'; text: string } | null;

const EMPTY_ADDRESS = {
  title: 'Home',
  first_name: '',
  last_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  country: 'United States',
  state: '',
  city: '',
  postal_code: '',
};

function Field({
  label,
  value,
  onChange,
  required,
  maxLength = 80,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-bold text-gray-700 mb-1">{label}</span>
      <input
        type="text"
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
      />
    </label>
  );
}

function Banner({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-3 rounded text-xs font-semibold flex items-center gap-2 border ${
        notice.kind === 'ok'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-rose-50 border-rose-200 text-rose-700'
      }`}
    >
      {notice.kind === 'ok' ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span>{notice.text}</span>
    </div>
  );
}

export function ProfileCard({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone, avatar_url: avatarUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'Could not save your profile.');
      setNotice({ kind: 'ok', text: 'Profile saved.' });
    } catch (err) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'Could not save your profile.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-xs">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-brand" />
          <span>My Profile</span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Signed in as {profile.email}. Your role is {profile.role} and can only be changed by an administrator.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <Banner notice={notice} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name *" value={fullName} onChange={setFullName} required maxLength={120} />
          <Field label="Phone" value={phone} onChange={setPhone} maxLength={40} />
        </div>

        <div>
          <span className="block text-xs font-bold text-gray-700 mb-1">Profile photo</span>
          <ImageUpload bucket="avatars" value={avatarUrl} onChange={setAvatarUrl} label="Upload profile photo" />
        </div>

        <div className="pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-brand text-white text-xs font-bold rounded hover:bg-brand-dark transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  );
}

export function AddressBook({ addresses: initial }: { addresses: UserAddress[] }) {
  const [addresses, setAddresses] = useState(initial);
  const [draft, setDraft] = useState<typeof EMPTY_ADDRESS | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  async function refetch() {
    const res = await fetch('/api/account/addresses');
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error ?? 'Could not load your addresses.');
    setAddresses(body.addresses as UserAddress[]);
  }

  async function run(action: () => Promise<void>, successText: string) {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await refetch();
      setNotice({ kind: 'ok', text: successText });
    } catch (err) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : 'That did not work.' });
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const isEdit = editingId !== null;
    void run(
      async () => {
        const res = await fetch(isEdit ? `/api/account/addresses/${editingId}` : '/api/account/addresses', {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? 'Could not save the address.');
        setDraft(null);
        setEditingId(null);
      },
      isEdit ? 'Address updated.' : 'Address saved.',
    );
  }

  function set<K extends keyof typeof EMPTY_ADDRESS>(key: K, value: string) {
    setDraft((prev) => ({ ...(prev ?? EMPTY_ADDRESS), [key]: value }));
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-xs">
      <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand" />
            <span>Address Book</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Checkout uses your default address. The first address you save becomes the default.
          </p>
        </div>
        {!draft && (
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY_ADDRESS);
              setEditingId(null);
              setNotice(null);
            }}
            className="px-4 py-2 bg-brand text-white text-xs font-bold rounded hover:bg-brand-dark transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add address</span>
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">
        <Banner notice={notice} />

        {addresses.length === 0 && !draft ? (
          <div className="py-8 text-center">
            <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-gray-800 mb-1">No saved addresses</h3>
            <p className="text-xs text-gray-500">Add one and checkout will fill itself in.</p>
          </div>
        ) : (
          addresses.map((address) => (
            <article key={address.id} className="border border-gray-200 rounded p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs text-gray-700 space-y-1">
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    {address.title}
                    {address.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wide">
                        <Star className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </p>
                  <p>
                    {address.first_name} {address.last_name} · {address.phone}
                  </p>
                  <p className="text-gray-500">
                    {address.address_line1}
                    {address.address_line2 ? `, ${address.address_line2}` : ''}, {address.city}, {address.state}{' '}
                    {address.postal_code}, {address.country}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!address.is_default && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          async () => {
                            const res = await fetch(`/api/account/addresses/${address.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ set_default: true }),
                            });
                            const body = await res.json();
                            if (!res.ok) throw new Error(body?.error ?? 'Could not change the default.');
                          },
                          `${address.title} is now your default address.`,
                        )
                      }
                      className="p-2 rounded border border-gray-200 text-gray-500 hover:text-brand hover:border-brand disabled:opacity-50"
                      aria-label={`Make ${address.title} the default address`}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setDraft({
                        title: address.title,
                        first_name: address.first_name,
                        last_name: address.last_name,
                        phone: address.phone,
                        address_line1: address.address_line1,
                        address_line2: address.address_line2 ?? '',
                        country: address.country,
                        state: address.state,
                        city: address.city,
                        postal_code: address.postal_code,
                      });
                      setEditingId(address.id);
                      setNotice(null);
                    }}
                    className="p-2 rounded border border-gray-200 text-gray-500 hover:text-brand hover:border-brand disabled:opacity-50"
                    aria-label={`Edit ${address.title}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        async () => {
                          const res = await fetch(`/api/account/addresses/${address.id}`, { method: 'DELETE' });
                          const body = await res.json();
                          if (!res.ok) throw new Error(body?.error ?? 'Could not delete the address.');
                        },
                        `Removed ${address.title}.`,
                      )
                    }
                    className="p-2 rounded border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                    aria-label={`Delete ${address.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}

        {draft && (
          <form onSubmit={handleSubmit} className="border border-gray-200 rounded p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                {editingId ? 'Edit address' : 'New address'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setEditingId(null);
                }}
                aria-label="Close the address form"
                className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Label *" value={draft.title} onChange={(v) => set('title', v)} required />
              <Field label="First name *" value={draft.first_name} onChange={(v) => set('first_name', v)} required />
              <Field label="Last name *" value={draft.last_name} onChange={(v) => set('last_name', v)} required />
              <Field label="Phone *" value={draft.phone} onChange={(v) => set('phone', v)} required />
              <Field label="Street address *" value={draft.address_line1} onChange={(v) => set('address_line1', v)} required maxLength={200} className="sm:col-span-2" />
              <Field label="Apartment, unit (optional)" value={draft.address_line2} onChange={(v) => set('address_line2', v)} maxLength={200} className="sm:col-span-2" />
              <Field label="City *" value={draft.city} onChange={(v) => set('city', v)} required />
              <Field label="State / region *" value={draft.state} onChange={(v) => set('state', v)} required />
              <Field label="Postal code *" value={draft.postal_code} onChange={(v) => set('postal_code', v)} required maxLength={20} />
              <Field label="Country *" value={draft.country} onChange={(v) => set('country', v)} required />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 bg-brand text-white text-xs font-bold rounded hover:bg-brand-dark transition disabled:opacity-60"
              >
                {busy ? 'Saving…' : editingId ? 'Update address' : 'Save address'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
