import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/session';

// The only way the browser learns a role. It always comes from the profiles
// table under RLS, so it can be used for menu rendering but never for a
// permission decision — those are made server-side by requireRole().
export async function GET() {
  try {
    const profile = await currentUser();
    if (!profile) return NextResponse.json({ authenticated: false }, { status: 401 });

    return NextResponse.json({
      authenticated: true,
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
    });
  } catch (error) {
    console.error('[auth] session lookup failed:', error);
    return NextResponse.json({ error: 'Session could not be verified' }, { status: 500 });
  }
}
