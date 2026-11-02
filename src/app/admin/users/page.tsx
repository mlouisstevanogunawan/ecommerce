import React from 'react';
import { Users } from 'lucide-react';
import { getAllUsers } from '@/lib/supabase/data';
import { requireRole } from '@/lib/auth/session';
import { AdminUsersTable } from './AdminUsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  try {
    const [me, users] = await Promise.all([requireRole(['admin']), getAllUsers()]);
    return <AdminUsersTable users={users} currentUserId={me.id} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The profiles table could not be read.';
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-brand" />
          <span>User Accounts &amp; RBAC Roles</span>
        </h1>
        <p className="mt-3 text-sm text-red-700">Accounts are unavailable: {message}</p>
      </div>
    );
  }
}
