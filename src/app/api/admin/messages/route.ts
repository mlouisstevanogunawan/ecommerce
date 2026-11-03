import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getContactMessages, markContactMessage } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const uuid = z.string().uuid();

const patchSchema = z.object({
  id: uuid,
  status: z.enum(['unread', 'read']),
});

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[admin/messages] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, messages: await getContactMessages() });
  } catch (error) {
    return respond(error, 'load messages');
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

  try {
    await markContactMessage(parsed.data.id, parsed.data.status);
    return NextResponse.json({ success: true, id: parsed.data.id, status: parsed.data.status });
  } catch (error) {
    return respond(error, 'update message status');
  }
}
