import { Settings } from 'lucide-react';
import { getSiteSettings } from '@/lib/supabase/data';
import { AdminSettingsManager } from './AdminSettingsManager';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  try {
    const settings = await getSiteSettings();
    return <AdminSettingsManager settings={settings} />;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'site_settings could not be read.';
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand" />
          <span>Site Settings</span>
        </h1>
        <p className="mt-3 text-sm text-red-700">Settings are unavailable: {message}</p>
      </div>
    );
  }
}
