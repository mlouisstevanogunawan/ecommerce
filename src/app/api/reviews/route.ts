import { NextResponse } from 'next/server';
import { z } from 'zod';
import { submitReview } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const schema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().trim().min(4).max(4000),
});

// submit_review() runs as SECURITY DEFINER and enforces sign-in, purchase
// history and one-review-per-customer in Postgres; the checks here only produce
// friendlier messages.
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${issue?.path.join('.') ?? 'request'}: ${issue?.message ?? 'invalid value'}` },
      { status: 400 },
    );
  }

  try {
    const id = await submitReview(parsed.data.product_id, parsed.data.rating, parsed.data.review_text);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[reviews] submit failed:', error);
    return NextResponse.json({ error: 'Your review could not be saved. Please try again.' }, { status: 500 });
  }
}
