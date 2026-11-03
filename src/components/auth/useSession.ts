'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/types';

export interface Session {
  full_name: string;
  role: UserRole;
}

// The role is read from /api/auth/me, which resolves it from the JWT against
// the profiles table. Nothing here trusts a client-side claim.
export function useSession() {
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
      setError('');
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

  const signOut = useCallback(async () => {
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return false;
    }
    setSession(null);
    return true;
  }, []);

  return { session, checked, error, reload: load, signOut };
}

export const HOME_BY_ROLE: Record<UserRole, string> = {
  customer: '/account/orders',
  seller: '/seller/dashboard',
  admin: '/admin/dashboard',
};
