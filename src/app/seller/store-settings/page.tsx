import React from 'react';
import { Settings } from 'lucide-react';
import { getMyStore } from '@/lib/supabase/data';
import { StoreSettingsForm } from './StoreSettingsForm';

export const dynamic = 'force-dynamic';

export default async function StoreSettingsPage() {
  try {
    const store = await getMyStore();
    return <StoreSettingsForm store={store} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The stores table could not be read.';
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand" />
          <span>Store Settings &amp; Profile</span>
        </h1>
        <p className="mt-3 text-sm text-red-700">Your store could not be loaded: {message}</p>
      </div>
    );
  }
}
