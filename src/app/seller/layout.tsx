import React from 'react';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';
import { getMyStore } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';
import { SellerShell } from './SellerShell';

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  // Middleware redirects as a convenience; this is the actual authority, and the
  // role comes from the profiles table rather than any client-writable cookie.
  try {
    await requireRole(['seller', 'admin']);
  } catch (error) {
    if (error instanceof HttpError) {
      redirect(`/login?error=unauthorized_role&redirect=${encodeURIComponent('/seller/dashboard')}`);
    }
    throw error;
  }

  const store = await getMyStore();

  return (
    <SellerShell storeName={store?.title ?? null} storeSlug={store?.slug ?? null}>
      {children}
    </SellerShell>
  );
}
