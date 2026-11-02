import React from 'react';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';
import { HttpError } from '@/lib/errors';
import { AdminShell } from './AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware redirects as a convenience; this is the actual authority, and the
  // role comes from the profiles table rather than any client-writable cookie.
  let admin;
  try {
    admin = await requireRole(['admin']);
  } catch (error) {
    if (error instanceof HttpError) {
      redirect(`/login?error=unauthorized_role&redirect=${encodeURIComponent('/admin/dashboard')}`);
    }
    throw error;
  }

  return <AdminShell adminName={admin.full_name || admin.email}>{children}</AdminShell>;
}
