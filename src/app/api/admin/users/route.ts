import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllUsers, updateUserRole } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';
import type { UserRole } from '@/lib/types';

const ROLES = ['customer', 'seller', 'admin'] as const;

const patchSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(ROLES),
});

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[admin/users] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, users: await getAllUsers() });
  } catch (error) {
    return respond(error, 'load users');
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
    const updated = await updateUserRole(parsed.data.user_id, parsed.data.role as UserRole);
    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    return respond(error, 'update role');
  }
}
