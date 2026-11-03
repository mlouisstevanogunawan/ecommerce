import { NextResponse } from 'next/server';
import { requireProfile } from '@/lib/auth/session';
import { updateMyProfile } from '@/lib/supabase/data';
import { firstIssue, profileSchema } from '@/lib/validation';
import { HttpError } from '@/lib/errors';

function errorResponse(error: unknown, operation: string) {
  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) console.error(`[account] ${operation} failed:`, error);
  const message = error instanceof Error ? error.message : `Failed to ${operation}`;
  return NextResponse.json({ error: message }, { status });
}

// GET returns the whole profile because the page renders email, phone and avatar;
// the role is included only for display and never read by the client for a decision.
export async function GET() {
  try {
    return NextResponse.json({ profile: await requireProfile() });
  } catch (error) {
    return errorResponse(error, 'load profile');
  }
}

export async function PUT(request: Request) {
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  try {
    return NextResponse.json({ profile: await updateMyProfile(parsed.data) });
  } catch (error) {
    return errorResponse(error, 'save profile');
  }
}
