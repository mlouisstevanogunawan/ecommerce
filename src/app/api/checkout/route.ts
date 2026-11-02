import { NextResponse } from 'next/server';
import { z } from 'zod';
import { placeOrder } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';
import { isValidCurrency } from '@/lib/currency/config';

// Totals, stock and coupons are computed inside place_order() in Postgres from
// the saved cart. Nothing that affects money is accepted from this request:
// no item list, no prices, no subtotal.
const address = z.object({
  title: z.string().trim().min(1).max(60),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(30),
  address_line1: z.string().trim().min(3).max(200),
  address_line2: z.string().trim().max(200).nullable().optional(),
  country: z.string().trim().min(2).max(80),
  state: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  postal_code: z.string().trim().min(2).max(20),
});

const body = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.string().trim().email().max(200),
  customerPhone: z.string().trim().min(7).max(30),
  shippingAddress: address,
  paymentMethod: z.enum(['credit_card', 'cod', 'bank_transfer']),
  couponCode: z.string().trim().max(40).nullable().optional(),
  currency: z.string().trim().length(3).optional(),
  exchangeRate: z.number().finite().positive().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  // Generated once per checkout attempt in the browser; a resubmit replays the
  // original orders instead of creating a second set.
  idempotencyKey: z.string().uuid(),
});

function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[checkout] order creation failed:', error);
  return NextResponse.json(
    { error: 'We could not place your order. Your cart has been kept, please try again.' },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = body.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${issue?.path.join('.') ?? 'request'}: ${issue?.message ?? 'invalid value'}` },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const currency = input.currency && isValidCurrency(input.currency) ? input.currency : 'USD';

  try {
    const orders = await placeOrder({
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      shippingAddress: { ...input.shippingAddress, is_default: false },
      paymentMethod: input.paymentMethod,
      couponCode: input.couponCode ?? null,
      displayCurrency: currency,
      exchangeRate: input.exchangeRate ?? 1,
      notes: input.notes ?? null,
      idempotencyKey: input.idempotencyKey,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return errorResponse(error);
  }
}
