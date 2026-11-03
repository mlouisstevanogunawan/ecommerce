import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteMyAddress, setDefaultMyAddress, updateMyAddress } from '@/lib/supabase/data';
import { addressSchema, firstIssue } from '@/lib/validation';
import { HttpError } from '@/lib/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function errorResponse(error: unknown, operation: string) {
  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) console.error(`[addresses] ${operation} failed:`, error);
  const message = error instanceof Error ? error.message : `Failed to ${operation}`;
  return NextResponse.json({ error: message }, { status });
}

const idSchema = z.string().uuid();

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'Unknown address' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  try {
    // The default flag moves through one SQL function because two rows change at once.
    if (body && typeof body === 'object' && (body as Record<string, unknown>).set_default === true) {
      return NextResponse.json({ address: await setDefaultMyAddress(id) });
    }

    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }
    return NextResponse.json({ address: await updateMyAddress(id, parsed.data) });
  } catch (error) {
    return errorResponse(error, 'update address');
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'Unknown address' }, { status: 400 });
  }

  try {
    await deleteMyAddress(id);
    return NextResponse.json({ deleted: id });
  } catch (error) {
    return errorResponse(error, 'delete address');
  }
}
