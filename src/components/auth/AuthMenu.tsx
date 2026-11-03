'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, Store, User } from 'lucide-react';
import { HOME_BY_ROLE, useSession } from './useSession';

export function AuthMenu() {
  const router = useRouter();
  const { session, checked, error, signOut } = useSession();

  async function handleSignOut() {
    if (await signOut()) {
      router.push('/');
      router.refresh();
    }
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
        {session.role === 'customer' ? 'My orders' : 'Dashboard'}
      </Link>
      <Link href="/account" className="hover:text-brand transition-colors">
        Account
      </Link>
      <button type="button" onClick={handleSignOut} className="flex items-center gap-1 hover:text-brand transition-colors">
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign out</span>
      </button>
    </div>
  );
}
