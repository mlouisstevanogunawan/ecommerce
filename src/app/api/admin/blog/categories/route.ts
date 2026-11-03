import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createBlogCategory, deleteBlogCategory, getBlogCategories } from '@/lib/supabase/data';
import { blogCategorySchema } from '@/lib/validation';
import { HttpError } from '@/lib/errors';

const uuid = z.string().uuid();

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[admin/blog/categories] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({ categories: await getBlogCategories() });
  } catch (error) {
    return respond(error, 'load blog categories');
  }
}

export async function POST(request: Request) {
  const parsed = blogCategorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid category' }, { status: 400 });
  }

  try {
    return NextResponse.json({ success: true, category: await createBlogCategory(parsed.data.name) });
  } catch (error) {
    return respond(error, 'create blog category');
  }
}

// blog_categories has ON DELETE CASCADE to blog_posts, so the caller must have been
// told how many posts disappear with it; the count travels with every list.
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'A valid category id is required' }, { status: 400 });
  }

  try {
    await deleteBlogCategory(parsedId.data);
    return NextResponse.json({ success: true, id: parsedId.data });
  } catch (error) {
    return respond(error, 'delete blog category');
  }
}
