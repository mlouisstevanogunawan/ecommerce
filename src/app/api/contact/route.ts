import { NextResponse } from 'next/server';
import { z } from 'zod';
import { submitContactMessage } from '@/lib/supabase/data';
import { currentUser } from '@/lib/auth/session';
import { HttpError } from '@/lib/errors';

const messageField = z.string().trim().min(10).max(4000);

// The public contact form is anonymous-capable; a product inquiry is not, and
// its name/email are taken from the session, never from the request body.
const schema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().max(200).optional(),
    subject: z.string().trim().max(200).nullish(),
    message: messageField,
    product_id: z.string().uuid().nullish(),
  })
  .refine((v) => (v.product_id ? true : Boolean(v.name && v.email)), {
    message: 'name and email are required',
    path: ['name'],
  });

function issue(error: z.ZodError) {
  const first = error.issues[0];
  return NextResponse.json(
    { error: `${first?.path.join('.') ?? 'request'}: ${first?.message ?? 'invalid value'}` },
    { status: 400 },
  );
}

// Writes to contact_messages, which only admins can read back. The insert is
// allowed for anon by RLS, so a visitor does not need an account to reach us.
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) return issue(parsed.error);

  try {
    let name = parsed.data.name as string;
    let email = parsed.data.email as string;

    if (parsed.data.product_id) {
      const profile = await currentUser();
      if (!profile) {
        return NextResponse.json({ error: 'Please sign in to ask a question.' }, { status: 401 });
      }
      name = profile.full_name || profile.email;
      email = profile.email;
    }

    await submitContactMessage({
      name,
      email,
      message: parsed.data.message,
      subject: parsed.data.subject ?? null,
      product_id: parsed.data.product_id ?? null,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[contact] submit failed:', error);
    return NextResponse.json({ error: 'Your message could not be sent. Please try again.' }, { status: 500 });
  }
}
