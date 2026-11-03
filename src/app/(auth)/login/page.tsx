'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, LogIn, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Same rule the /auth/callback route uses: only same-origin relative paths, so
// ?redirect=... can never ship a freshly signed-in user to another site.
function safeRedirect(raw: string | null): string {
  const value = (raw ?? '').trim();
  return value.startsWith('/') && !value.startsWith('//') ? value : '';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = safeRedirect(searchParams.get('redirect'));
  const errorParam = searchParams.get('error') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // Sign in against Supabase Auth or show the real failure. There is no
    // offline "session cookie" path: an unverified login must never look like
    // a success, and the role always comes from the database afterwards.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);

    const target = redirectUrl || (await resolveHome());
    router.replace(target);
    router.refresh();
    setLoading(false);
  };

  async function resolveHome(): Promise<string> {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) return '/account/orders';
      if (payload.role === 'admin') return '/admin/dashboard';
      if (payload.role === 'seller') return '/seller/dashboard';
      return '/account/orders';
    } catch {
      return '/account/orders';
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-xs">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Sign In to Modesy</h1>
        <p className="text-xs text-gray-500 mt-1">
          Enter your credentials to access your customer orders, vendor dashboard, or admin center.
        </p>
      </div>

      {errorParam === 'unauthorized_admin' && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Access Denied: Super Admin privileges are required to access this resource.</span>
        </div>
      )}

      {(errorParam === 'unauthorized_seller' || errorParam === 'unauthorized_role') && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Access Denied: your account does not have the role this area requires.</span>
        </div>
      )}

      {errorParam === 'confirmation_failed' && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>That confirmation link has expired or was already used. Sign in below to continue.</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Authentication verified! Redirecting to secure portal...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
          <div className="relative">
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
            />
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="login-password" className="block text-xs font-bold text-gray-700">Password *</label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
            />
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
        </button>
      </form>

      {/* Switch to Register */}
      <div className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
        <span>Don&apos;t have an account yet? </span>
        <Link href="/register" className="font-bold text-brand hover:underline">
          Create an Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-gray-50 min-h-[75vh] py-16 flex items-center justify-center">
      <div className="modesy-container max-w-md w-full">
        <Suspense fallback={<div className="text-center p-8 text-xs text-gray-500">Loading sign-in...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
