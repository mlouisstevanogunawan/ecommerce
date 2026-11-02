import { NextResponse } from 'next/server';
import { getCheckoutRules } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

// Shipping thresholds are public catalogue rules (checkout_rules() is granted to
// anon), so a guest cart can show the same numbers the order will be priced with.
export async function GET() {
  try {
    return NextResponse.json(await getCheckoutRules());
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error('[checkout] rules load failed:', error);
    const message = error instanceof Error ? error.message : 'Checkout rules are unavailable';
    return NextResponse.json({ error: message }, { status });
  }
}
