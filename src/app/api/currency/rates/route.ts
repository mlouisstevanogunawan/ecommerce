import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/lib/currency/rates';

export const revalidate = 21600; // 6 hours

export async function GET() {
  const result = await getExchangeRates();
  return NextResponse.json(result);
}
