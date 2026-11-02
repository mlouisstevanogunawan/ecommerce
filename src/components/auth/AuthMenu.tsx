'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, Store, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/types';

interface Session {
  full_name: string;
  role: UserRole;
}

const HOME_BY_ROLE: Record<UserRole, string> = {
  customer: '/account/orders',
  seller: '/seller/dashboard',
  admin: '/admin/dashboard',
};

export function AuthMenu() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSession(null);
      setChecked(true);
      return;
    }

    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) {
      // A session that the server cannot resolve is not a signed-in user.
      setSession(null);
      setError('Your account could not be loaded. Please sign in again.');
      setChecked(true);
      return;
    }

    const payload = (await res.json()) as Session;
    setSession({ full_name: payload.full_name, role: payload.role });
    setError('');
    setChecked(true);
  }, []);

  useEffect(() => {
    void load();
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => subscription.unsubscribe();
  }, [load]);

  async function signOut() {
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    setSession(null);
    router.push('/');
    router.refresh();
  }

  if (!checked) {
    return <span className="text-[11px] font-semibold text-gray-400">···</span>;
  }

  if (!session) {
    return (
      <div className="flex items-center space-x-1 font-medium">
        <Link href="/login" className="hover:text-brand transition-colors">
          Login
        </Link>
        <span className="text-gray-300">/</span>
        <Link href="/register" className="hover:text-brand transition-colors">
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 font-medium">
      {error && <span className="text-[11px] font-semibold text-rose-600">{error}</span>}
      <span className="flex items-center gap-1 text-gray-700">
        {session.role === 'admin' ? (
          <ShieldCheck className="w-3.5 h-3.5" />
        ) : session.role === 'seller' ? (
          <Store className="w-3.5 h-3.5" />
        ) : (
          <User className="w-3.5 h-3.5" />
        )}
        <span className="max-w-[10rem] truncate">{session.full_name}</span>
      </span>
      <Link href={HOME_BY_ROLE[session.role]} className="hover:text-brand transition-colors">
        My Account
      </Link>
      <button type="button" onClick={signOut} className="flex items-center gap-1 hover:text-brand transition-colors">
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign out</span>
      </button>
    </div>
  );
}
