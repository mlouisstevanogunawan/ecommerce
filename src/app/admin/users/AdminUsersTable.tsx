'use client';

import { useState } from 'react';
import { Users, Shield, Store, User, CheckCircle, AlertCircle } from 'lucide-react';
import { UserRole } from '@/lib/types';
import type { AdminUser } from '@/lib/supabase/data';

type Notice = { kind: 'ok' | 'err'; text: string } | null;

export function AdminUsersTable({ users: initial, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>(initial);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeRole(userId: string, role: UserRole) {
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    setBusyId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setNotice({ kind: 'ok', text: `Role saved as "${role}".` });
    } catch (err: unknown) {
      setUsers(previous);
      setNotice({
        kind: 'err',
        text: err instanceof Error ? err.message : 'The role was not saved; the change was rolled back.',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-brand" />
          <span>User Accounts &amp; RBAC Roles ({users.length})</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage platform roles: elevate customers to multi-vendor sellers or assign admin privileges.
        </p>
      </div>

      {notice && (
        <div
          className={`mx-6 mt-6 p-3 rounded text-xs font-semibold flex items-center gap-2 border ${
            notice.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notice.kind === 'ok' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-6">User</th>
              <th className="py-3.5 px-6">Email</th>
              <th className="py-3.5 px-6">Joined</th>
              <th className="py-3.5 px-6">Current Role</th>
              <th className="py-3.5 px-6 text-right">Change Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/80 transition">
                <td className="py-4 px-6">
                  <div className="font-bold text-slate-900">{user.full_name || 'Unnamed account'}</div>
                  {user.store_names.length > 0 && (
                    <span className="text-[11px] text-brand font-semibold">
                      Store: {user.store_names.join(', ')}
                    </span>
                  )}
                </td>
                <td className="py-4 px-6 text-slate-600">{user.email}</td>
                <td className="py-4 px-6 text-slate-400">{user.created_at.slice(0, 10)}</td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold capitalize ${
                      user.role === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : user.role === 'seller'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {user.role === 'admin' && <Shield className="w-3 h-3" />}
                    {user.role === 'seller' && <Store className="w-3 h-3" />}
                    {user.role === 'customer' && <User className="w-3 h-3" />}
                    {user.role}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <select
                    value={user.role}
                    disabled={busyId === user.id || user.id === currentUserId}
                    title={user.id === currentUserId ? 'You cannot change your own role' : undefined}
                    onChange={(e) => changeRole(user.id, e.target.value as UserRole)}
                    className="border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-brand font-medium disabled:opacity-50"
                  >
                    <option value="customer">Customer</option>
                    <option value="seller">Seller (Vendor)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-6 text-slate-500">
                  No accounts have signed up yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
