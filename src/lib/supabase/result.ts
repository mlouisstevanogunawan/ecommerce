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

// PostgREST renders numeric/decimal columns either as JSON numbers or as strings
// depending on the server version, and the domain model uses numbers.
// A missing amount is zero (discounted_price is nullable), but a value that is
// present and unreadable is corrupt data: charging it as 0 would sell an item for
// nothing, so it fails the request instead.
export function money(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new HttpError(502, `Unusable amount in the database: ${value}`);
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (value.trim() === '' || !Number.isFinite(parsed)) {
      throw new HttpError(502, `Unusable amount in the database: "${value}"`);
    }
    return parsed;
  }
  throw new HttpError(502, `Unusable amount in the database: ${JSON.stringify(value)}`);
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
