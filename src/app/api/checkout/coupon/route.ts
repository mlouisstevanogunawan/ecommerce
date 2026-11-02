import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCouponDiscount } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';
import { currentUser } from '@/lib/auth/session';

// Display-only: the authoritative discount is recomputed inside place_order().
// Keeping this next to the database rules is what stops the cart, the checkout
// page and the order total from disagreeing with each other.
const query = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.coerce.number().finite().min(0),
});

export async function GET(request: Request) {
  // coupon_discount() is granted to authenticated only, so anonymous visitors
  // cannot enumerate valid codes and their percentages.
  if (!(await currentUser())) {
    return NextResponse.json({ error: 'Please sign in to apply a coupon.' }, { status: 401 });
  }

  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'code and subtotal are required' }, { status: 400 });
  }

  try {
    const discount = await getCouponDiscount(parsed.data.code, parsed.data.subtotal);
    return NextResponse.json({ code: parsed.data.code.toUpperCase(), discount });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error('[coupon] validation failed:', error);
    const message = error instanceof Error ? error.message : 'Coupon could not be validated';
    return NextResponse.json({ error: message }, { status });
  }
}
