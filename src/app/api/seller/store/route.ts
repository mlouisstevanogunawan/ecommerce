import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMyStore, saveMyStore } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(140)
    .optional(),
  description: z.string().trim().max(4000).nullish(),
  phone: z.string().trim().max(30).nullish(),
  address: z.string().trim().max(300).nullish(),
  logo_url: z.string().trim().url().max(2000).nullish(),
  cover_url: z.string().trim().url().max(2000).nullish(),
});

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[seller/store] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, store: await getMyStore() });
  } catch (error) {
    return respond(error, 'load store');
  }
}

// is_verified and the sales aggregates are not accepted here; the database also
// revokes those columns from the authenticated role.
export async function PUT(request: Request) {
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
    return NextResponse.json({ success: true, store: await saveMyStore(parsed.data) });
  } catch (error) {
    return respond(error, 'save store');
  }
}
