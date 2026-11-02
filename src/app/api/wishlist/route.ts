import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWishlist, toggleWishlist } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

function errorResponse(error: unknown, operation: string) {
  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) console.error(`[wishlist] ${operation} failed:`, error);
  const message = error instanceof Error ? error.message : `Failed to ${operation}`;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const products = await getWishlist();
    return NextResponse.json({ ids: products.map((p) => p.id) });
  } catch (error) {
    return errorResponse(error, 'load wishlist');
  }
}

export async function POST(request: Request) {
  const parsed = z.object({ product_id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'product_id must be a valid id' }, { status: 400 });
  }

  try {
    const { inWishlist } = await toggleWishlist(parsed.data.product_id);
    const products = await getWishlist();
    return NextResponse.json({ inWishlist, ids: products.map((p) => p.id) });
  } catch (error) {
    return errorResponse(error, 'update wishlist');
  }
}
