import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteProduct, getAllProducts, updateProductModeration } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const uuid = z.string().uuid();

// Only the curation fields the moderation console owns. A listing's price,
// stock, text and publication status belong to the seller.
const patchSchema = z.object({
  id: uuid,
  is_featured: z.boolean().optional(),
  is_special_offer: z.boolean().optional(),
}).refine(
  (v) => v.is_featured !== undefined || v.is_special_offer !== undefined,
  { message: 'No field to update' },
);

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[admin/products] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, products: await getAllProducts() });
  } catch (error) {
    return respond(error, 'load products');
  }
}

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

  const { id, ...flags } = parsed.data;
  try {
    await updateProductModeration(id, flags);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return respond(error, 'moderate product');
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'A valid product id is required' }, { status: 400 });
  }

  try {
    await deleteProduct(parsedId.data);
    return NextResponse.json({ success: true, id: parsedId.data });
  } catch (error) {
    return respond(error, 'delete product');
  }
}
