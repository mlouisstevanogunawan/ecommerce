'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    isVendor: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Real Supabase Auth signup. The profile row is created by the
  // on_auth_user_created database trigger; 'admin' is not an option here and
  // the trigger rejects it anyway.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, role: form.isVendor ? 'seller' : 'customer' },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Faccount%2Forders`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setNeedsConfirmation(!data.session);
    setLoading(false);

    if (data.session) {
      router.replace(form.isVendor ? '/seller/dashboard' : '/account/orders');
      router.refresh();
    }
  }

  return (
    <div className="bg-gray-50 min-h-[75vh] py-16 flex items-center justify-center">
      <div className="modesy-container max-w-md w-full">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-xs">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900">Create Account</h1>
            <p className="text-xs text-gray-500 mt-1">
              Create an account to track orders, or open a store and list your own products.
            </p>
          </div>

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {needsConfirmation
                  ? 'Account created. Check your inbox to confirm your email address, then sign in.'
                  : 'Account registered successfully! Redirecting...'}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="e.g. alex@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.isVendor}
                onChange={(e) => setForm({ ...form, isVendor: e.target.checked })}
                className="rounded border-gray-300 text-brand focus:ring-brand w-4 h-4"
              />
              <span className="text-xs font-semibold text-gray-700">
                I want to register as a Vendor (Sell products)
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating Account...' : 'Register Now'}</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
            <span>Already have an account? </span>
            <Link href="/login" className="font-bold text-brand hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
