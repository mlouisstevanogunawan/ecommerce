import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  syncCart,
  updateCartQuantity,
} from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

// The saved cart belongs to the signed-in user. Guests keep their cart in
// localStorage only, so an anonymous call here is a 401 rather than a shared
// "guest_cart" row that every visitor would read and overwrite.
const uuid = z.string().uuid();

const line = z.object({
  product_id: uuid,
  variant_id: uuid.nullable().optional(),
  quantity: z.number().int().min(1).max(99),
});

const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('sync'), items: z.array(line).max(100) }),
  z.object({ action: z.literal('add'), product_id: uuid, variant_id: uuid.nullable().optional(), quantity: z.number().int().min(1).max(99).default(1) }),
  z.object({ action: z.literal('update'), item_id: uuid, quantity: z.number().int().min(0).max(99) }),
  z.object({ action: z.literal('remove'), item_id: uuid }),
  z.object({ action: z.literal('clear') }),
]);

function errorResponse(error: unknown, operation: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: `Invalid request: ${error.issues[0]?.message ?? 'check the payload'}` }, { status: 400 });
  }
  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) console.error(`[cart] ${operation} failed:`, error);
  const message = error instanceof Error ? error.message : `Failed to ${operation}`;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    return NextResponse.json({ cart: await getCart() });
  } catch (error) {
    return errorResponse(error, 'load cart');
  }
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = body.safeParse(json);
  if (!parsed.success) return errorResponse(parsed.error, 'validate cart request');

  try {
    switch (parsed.data.action) {
      case 'sync': {
        const cart = await syncCart(
          parsed.data.items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id ?? null, quantity: i.quantity })),
        );
        return NextResponse.json({ cart });
      }
      case 'add': {
        const cart = await addToCart(parsed.data.product_id, parsed.data.quantity, parsed.data.variant_id ?? null);
        return NextResponse.json({ cart });
      }
      case 'update': {
        const cart = await updateCartQuantity(parsed.data.item_id, parsed.data.quantity);
        return NextResponse.json({ cart });
      }
      case 'remove': {
        const cart = await removeFromCart(parsed.data.item_id);
        return NextResponse.json({ cart });
      }
      case 'clear': {
        return NextResponse.json({ cart: await clearCart() });
      }
    }
  } catch (error) {
    return errorResponse(error, 'save cart');
  }
}
