import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCategory, deleteCategory } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const uuid = z.string().uuid();

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  image_url: z.string().url().max(2000).nullable().optional(),
  parent_id: uuid.nullable().optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[admin/categories] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${issue?.path.join('.') ?? 'request'}: ${issue?.message ?? 'invalid value'}` },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ success: true, category: await createCategory(parsed.data) });
  } catch (error) {
    return respond(error, 'create category');
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'A valid category id is required' }, { status: 400 });
  }

  try {
    await deleteCategory(parsedId.data);
    return NextResponse.json({ success: true, id: parsedId.data });
  } catch (error) {
    return respond(error, 'delete category');
  }
}
