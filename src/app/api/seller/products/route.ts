import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createProduct, deleteProduct, getSellerProducts, updateProductStatus } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const uuid = z.string().uuid();

const createSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  sku: z.string().trim().min(3).max(60),
  description: z.string().trim().min(10).max(20000),
  category_id: uuid,
  price: z.number().finite().min(0).max(99999999),
  discount_rate: z.number().int().min(0).max(100),
  stock: z.number().int().min(0).max(1000000),
  is_digital: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_special_offer: z.boolean().optional(),
  status: z.enum(['draft', 'pending', 'published']).optional(),
  image_url: z.string().url().max(2000).nullable().optional(),
});

const patchSchema = z.object({
  id: uuid,
  status: z.enum(['draft', 'pending', 'published']),
});

// Both helpers create seller/admin-owned rows; data.ts enforces ownership through
// requireRole() plus RLS, and the service-role key is never used here.
function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[seller/products] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

function badRequest(issue: z.ZodIssue | undefined) {
  return NextResponse.json(
    { error: `${issue?.path.join('.') ?? 'request'}: ${issue?.message ?? 'invalid value'}` },
    { status: 400 },
  );
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, products: await getSellerProducts() });
  } catch (error) {
    return respond(error, 'load products');
  }
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.issues[0]);

  try {
    return NextResponse.json({ success: true, product: await createProduct(parsed.data) });
  } catch (error) {
    return respond(error, 'create product');
  }
}

// Status changes are a separate, explicit action so a client cannot send a
// partial product object and have unknown fields written.
export async function PATCH(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.issues[0]);

  try {
    await updateProductStatus(parsed.data.id, parsed.data.status);
    return NextResponse.json({ success: true, id: parsed.data.id, status: parsed.data.status });
  } catch (error) {
    return respond(error, 'update product status');
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'A valid product id is required' }, { status: 400 });
  }

  try {
    return NextResponse.json({ success: await deleteProduct(parsedId.data) });
  } catch (error) {
    return respond(error, 'delete product');
  }
}
