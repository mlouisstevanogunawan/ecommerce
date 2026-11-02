'use client';

import React, { useState } from 'react';
import { UserPlus, UserCheck, MessageCircle } from 'lucide-react';
import { Store } from '@/lib/types';

interface SellerProfileActionsProps {
  store: Store;
}

export function SellerProfileActions({ store }: SellerProfileActionsProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(148);

  const toggleFollow = () => {
    if (isFollowing) {
      setFollowersCount((prev) => prev - 1);
      setIsFollowing(false);
    } else {
      setFollowersCount((prev) => prev + 1);
      setIsFollowing(true);
    }
  };

  const sellerPhone = store.phone?.replace(/[^0-9]/g, '') || '15417543010';
  const whatsappUrl = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(
    `Hello ${store.title}, I saw your store on Modesy marketplace!`
  )}`;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
      <button
        type="button"
        onClick={toggleFollow}
        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold transition shadow-xs ${
          isFollowing
            ? 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'
            : 'bg-brand hover:bg-brand-dark text-white'
        }`}
      >
        {isFollowing ? (
          <>
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Following ({followersCount})</span>
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            <span>Follow Store ({followersCount})</span>
          </>
        )}
      </button>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition shadow-xs"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Contact Vendor</span>
      </a>
    </div>
  );
}
