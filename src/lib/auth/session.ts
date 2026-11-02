import { cache } from 'react';
import { HttpError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { unwrap } from '@/lib/supabase/result';
import type { Profile, UserRole } from '@/lib/types';

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  // The session gives us the user id; the role always comes from the database.
  // Never trust a role that arrived through a cookie, header, or request body.
  const profile = unwrap(
    await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle(),
    'Load profile',
  );
  if (!profile) return null;

  return { ...profile, role: profile.role as UserRole } as Profile;
}

// Cached so a request that calls it from a layout, a page and an API route only
// hits Auth + profiles once.
export const currentUser = cache(() => getSessionProfile());

export async function requireProfile(): Promise<Profile> {
  const profile = await currentUser();
  if (!profile) throw new HttpError(401, 'You must be signed in to do that.');
  return profile;
}

export async function requireRole(roles: UserRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) {
    throw new HttpError(403, `Requires one of these roles: ${roles.join(', ')}.`);
  }
  return profile;
}

export async function getSupabase() {
  return createClient();
}
