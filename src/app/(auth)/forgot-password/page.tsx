'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
  };

  return (
    <div className="bg-gray-50 min-h-[75vh] py-16 flex items-center justify-center">
      <div className="modesy-container max-w-md w-full">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-xs">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900">Reset Password</h1>
            <p className="text-xs text-gray-500 mt-1">
              Enter your email address and we will send you a password recovery link.
            </p>
          </div>

          {sent ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-sm">Recovery Link Sent!</h4>
              <p className="text-xs text-emerald-700">
                Check your inbox for <strong>{email}</strong> for instructions to reset your password.
              </p>
              <Link
                href="/login"
                className="inline-block mt-2 text-xs font-bold text-brand hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Send Reset Link</span>
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
