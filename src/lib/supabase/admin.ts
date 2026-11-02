import { createClient } from '@supabase/supabase-js';
import { serviceRoleKey, supabaseUrl } from '@/lib/env';

// Bypasses Row Level Security. Server-side use only, and only where the request
// legitimately has no user session (admin aggregates, Auth Admin user creation,
// storage cleanup). Ordinary user queries must use createClient() from ./server
// so that RLS enforces ownership.
export function createAdminClient() {
  return createClient(supabaseUrl(), serviceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
