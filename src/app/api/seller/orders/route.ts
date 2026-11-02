import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSellerOrders, updateOrderStatus } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;

const patchSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  payment_status: z.enum(PAYMENT_STATUSES).optional(),
});

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[seller/orders] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, orders: await getSellerOrders() });
  } catch (error) {
    return respond(error, 'load orders');
  }
}

// Status changes run inside update_order_status(), which re-checks store
// ownership in Postgres and decrements stock when an order is cancelled.
export async function PATCH(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${issue?.path.join('.') ?? 'request'}: ${issue?.message ?? 'invalid value'}` },
      { status: 400 },
    );
  }

  try {
    const order = await updateOrderStatus(parsed.data.order_id, parsed.data.status, parsed.data.payment_status);
    return NextResponse.json({ success: true, order });
  } catch (error) {
    return respond(error, 'update order');
  }
}
