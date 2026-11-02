import { HttpError } from '@/lib/errors';

type Result<T> = { data: T; error: { message: string; code?: string; details?: string } | null };

// Every Supabase call must be checked. Unwrapping here keeps the call sites short
// and makes "ignore the error and return fake data" impossible by construction.
export function unwrap<T>(result: Result<T>, operation: string): T {
  if (result.error) {
    const { code, message } = result.error;
    throw new HttpError(502, code ? `${operation} failed (${code}: ${message})` : `${operation} failed (${message})`);
  }
  return result.data;
}

export function orThrow<T>(data: T, operation: string): NonNullable<T> {
  if (data === null || data === undefined) {
    throw new HttpError(404, `${operation} was not found`);
  }
  return data;
}

// PostgREST renders numeric/decimal columns either as JSON numbers or as strings
// depending on the server version, and the domain model uses numbers.
export function money(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function moneyIn(row: Record<string, unknown>, columns: readonly string[]): Record<string, unknown> {
  const next = { ...row };
  for (const column of columns) {
    if (column in next) next[column] = money(next[column]);
  }
  return next;
}

export function moneyList<T extends Record<string, unknown>>(
  rows: T[],
  columns: readonly string[],
): Record<string, unknown>[] {
  return (rows ?? []).map((row) => moneyIn(row, columns));
}
