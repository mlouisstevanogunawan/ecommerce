import Link from 'next/link';
import { ChevronRight, Package } from 'lucide-react';
import { getMyAddresses } from '@/lib/supabase/data';
import { requireProfile } from '@/lib/auth/session';
import { AddressBook, ProfileCard } from './AccountPanels';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const [profile, addresses] = await Promise.all([requireProfile(), getMyAddresses()]);

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container max-w-4xl">
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">My Account</span>
        </nav>

        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-xl font-bold text-gray-900">Account settings</h1>
          <Link
            href="/account/orders"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded hover:border-brand hover:text-brand transition flex items-center gap-1.5"
          >
            <Package className="w-4 h-4" />
            <span>My orders</span>
          </Link>
        </div>

        <div className="space-y-6">
          <ProfileCard profile={profile} />
          <AddressBook addresses={addresses} />
        </div>
      </div>
    </div>
  );
}
