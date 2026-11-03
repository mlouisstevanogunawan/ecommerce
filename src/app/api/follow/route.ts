import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStoreFollowInfo, toggleFollowStore } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const query = z.object({ storeId: z.string().uuid() });

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[follow] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

// The count is public (visitors see it); is_following_store reads auth.uid(),
// which is null for a visitor, so an anonymous caller simply gets false.
export async function GET(request: Request) {
  const parsed = query.safeParse({ storeId: new URL(request.url).searchParams.get('storeId') });
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid storeId is required' }, { status: 400 });
  }

  try {
    return NextResponse.json(await getStoreFollowInfo(parsed.data.storeId));
  } catch (error) {
    return respond(error, 'load follow state');
  }
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = query.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid storeId is required' }, { status: 400 });
  }

  try {
    // toggleFollowStore calls requireProfile(), so an anonymous request is
    // rejected with 401 there rather than here.
    return NextResponse.json({ success: true, ...(await toggleFollowStore(parsed.data.storeId)) });
  } catch (error) {
    return respond(error, 'toggle follow');
  }
}
