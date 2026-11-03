import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createMyAddress, getMyAddresses } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

function errorResponse(error: unknown, operation: string) {
  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) console.error(`[addresses] ${operation} failed:`, error);
  const message = error instanceof Error ? error.message : `Failed to ${operation}`;
  return NextResponse.json({ error: message }, { status });
}

export const addressSchema = z.object({
  title: z.string().trim().min(1, 'Give the address a label').max(60),
  first_name: z.string().trim().min(1, 'First name is required').max(80),
  last_name: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z.string().trim().min(3, 'Phone is required').max(40),
  address_line1: z.string().trim().min(5, 'Street address is required').max(200),
  address_line2: z.string().trim().max(200).optional().nullable().or(z.literal('')),
  country: z.string().trim().min(2, 'Country is required').max(80),
  state: z.string().trim().min(1, 'State or region is required').max(80),
  city: z.string().trim().min(1, 'City is required').max(80),
  postal_code: z.string().trim().min(2, 'Postal code is required').max(20),
});

export async function GET() {
  try {
    return NextResponse.json({ addresses: await getMyAddresses() });
  } catch (error) {
    return errorResponse(error, 'load addresses');
  }
}

export async function POST(request: Request) {
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid address' }, { status: 400 });
  }

  try {
    return NextResponse.json({ address: await createMyAddress(parsed.data) });
  } catch (error) {
    return errorResponse(error, 'save address');
  }
}
