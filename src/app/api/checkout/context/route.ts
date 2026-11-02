import { NextResponse } from 'next/server';
import { getCheckoutContext } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

export async function GET() {
  try {
    const { profile, address, rules } = await getCheckoutContext();
    return NextResponse.json({
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone ?? '',
      address,
      rules,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error('[checkout] context load failed:', error);
    const message = error instanceof Error ? error.message : 'Checkout is unavailable';
    return NextResponse.json({ error: message }, { status });
  }
}
