import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteBlogPost, getAdminBlogPosts, saveBlogPost } from '@/lib/supabase/data';
import { blogPostSchema } from '@/lib/validation';
import { HttpError } from '@/lib/errors';

const uuid = z.string().uuid();

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[admin/blog] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

function badRequest(error: z.ZodError) {
  const issue = error.issues[0];
  return NextResponse.json({ error: issue?.message ?? 'Invalid blog post' }, { status: 400 });
}

// Drafts are included: only an admin reaches this route, and RLS lets an admin read
// unpublished posts (blog_posts_select).
export async function GET() {
  try {
    return NextResponse.json({ posts: await getAdminBlogPosts() });
  } catch (error) {
    return respond(error, 'load blog posts');
  }
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = blogPostSchema.extend({ id: uuid.optional() }).safeParse(json);
  if (!parsed.success) return badRequest(parsed.error);

  try {
    return NextResponse.json({ success: true, post: await saveBlogPost(parsed.data) });
  } catch (error) {
    return respond(error, 'save blog post');
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'A valid blog post id is required' }, { status: 400 });
  }

  try {
    await deleteBlogPost(parsedId.data);
    return NextResponse.json({ success: true, id: parsedId.data });
  } catch (error) {
    return respond(error, 'delete blog post');
  }
}
