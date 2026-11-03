'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Reached from /auth/callback?next=/reset-password after a recovery link has
// exchanged its code for a session. Without that session there is nothing to
// update, so the page says so instead of pretending the password changed.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setErrorMessage('The two passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMessage(
        /no session|invalid claim|session expired/i.test(error.message)
          ? 'This recovery link has expired or was already used. Request a new one from the login page.'
          : error.message,
      );
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMessage('No signed-in session was found. Open the recovery link again from your email.');
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="bg-gray-50 min-h-[75vh] py-16 flex items-center justify-center">
      <div className="modesy-container max-w-md w-full">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-xs">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900">Choose a new password</h1>
            <p className="text-xs text-gray-500 mt-1">
              Your recovery link is verified. Set a new password to finish.
            </p>
          </div>

          {done ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-sm">Password updated</h4>
              <p className="text-xs text-emerald-700">You are signed in with the new password.</p>
              <Link
                href="/account/orders"
                className="inline-block mt-2 text-xs font-bold text-brand hover:underline"
              >
                Go to my account
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label htmlFor="new-password" className="block text-xs font-bold text-gray-700 mb-1">
                  New password *
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-bold text-gray-700 mb-1">
                  Confirm password *
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Updating...' : 'Update Password'}</span>
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-brand"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
