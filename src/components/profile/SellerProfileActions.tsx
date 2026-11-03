'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, UserCheck, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { Store } from '@/lib/types';

interface SellerProfileActionsProps {
  store: Store;
  initialFollowers: number;
  initialIsFollowing: boolean;
}

export function SellerProfileActions({
  store,
  initialFollowers,
  initialIsFollowing,
}: SellerProfileActionsProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggleFollow() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        if (res.status === 401) {
          router.push('/login?redirect=' + encodeURIComponent(`/profile/${store.slug}`));
          return;
        }
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setIsFollowing(Boolean(json.isFollowing));
      setFollowersCount(Number(json.followers));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The follow state could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  // A message link is only offered when the seller actually published a phone
  // number; inventing one would send the visitor to a stranger.
  const sellerPhone = store.phone?.replace(/[^0-9]/g, '') ?? '';
  const whatsappUrl = sellerPhone
    ? `https://wa.me/${sellerPhone}?text=${encodeURIComponent(`Hello ${store.title}, I saw your store on Modesy marketplace!`)}`
    : null;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={toggleFollow}
          disabled={busy}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold transition shadow-xs disabled:opacity-60 ${
            isFollowing
              ? 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'
              : 'bg-brand hover:bg-brand-dark text-white'
          }`}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isFollowing ? (
            <UserCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span>{isFollowing ? `Following (${followersCount})` : `Follow Store (${followersCount})`}</span>
        </button>
        {error && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </span>
        )}
      </div>

      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition shadow-xs"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Contact Vendor</span>
        </a>
      ) : (
        <Link
          href="/contact"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-bold transition shadow-xs"
        >
          <MessageCircle className="w-4 h-4" />
          <span>No phone listed</span>
        </Link>
      )}
    </div>
  );
}
