import { NextResponse } from 'next/server';
import { z } from 'zod';
import { subscribeNewsletter } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const schema = z.object({ email: z.string().trim().email().max(200) });

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
  }

  try {
    await subscribeNewsletter(parsed.data.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[newsletter] subscribe failed:', error);
    return NextResponse.json({ error: 'Your subscription could not be saved. Please try again.' }, { status: 500 });
  }
}
