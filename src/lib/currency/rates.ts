import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from './config';

export interface ExchangeRatesResult {
  base: string;
  rates: Record<string, number>;
  updatedAt: string;
  isFallback?: boolean;
  // Currency codes the live answer did not contain, so their rate is the bundled
  // approximation rather than today's market rate.
  missing?: string[];
}

// Fallback rates if external API is unreachable on startup
const STATIC_FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  IDR: 16000,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 155.0,
  SGD: 1.35,
  MYR: 4.7,
  AUD: 1.5,
};

let cachedRates: ExchangeRatesResult | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function getExchangeRates(): Promise<ExchangeRatesResult> {
  const now = Date.now();
  if (cachedRates && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedRates;
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 21600 }, // 6 hours Next.js revalidation
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Exchange rate API responded with status ${res.status}`);
    }

    const data = await res.json();
    if (data.result !== 'success' || !data.rates) {
      throw new Error('Invalid response structure from exchange rate API');
    }

    const filteredRates: Record<string, number> = {};
    const missing: string[] = [];
    for (const curr of SUPPORTED_CURRENCIES) {
      if (typeof data.rates[curr.code] === 'number') {
        filteredRates[curr.code] = data.rates[curr.code];
      } else {
        // An answer that lacks one currency is only partly live. Silently
        // substituting the bundled number would make a stale rate look current.
        missing.push(curr.code);
        filteredRates[curr.code] = STATIC_FALLBACK_RATES[curr.code] || 1;
      }
    }

    cachedRates = {
      base: DEFAULT_CURRENCY,
      rates: filteredRates,
      updatedAt: new Date().toISOString(),
      isFallback: missing.length > 0,
      missing,
    };
    lastFetchTime = now;
    return cachedRates;
  } catch (error) {
    console.warn('[ExchangeRates] Failed to fetch live exchange rates:', error);

    if (cachedRates) {
      // Reaching this branch means the cache is already older than its TTL, so no
      // number in it can be called today's rate.
      return {
        ...cachedRates,
        isFallback: true,
        missing: SUPPORTED_CURRENCIES.map((curr) => curr.code),
      };
    }

    return {
      base: DEFAULT_CURRENCY,
      rates: { ...STATIC_FALLBACK_RATES },
      updatedAt: new Date().toISOString(),
      isFallback: true,
      missing: SUPPORTED_CURRENCIES.map((curr) => curr.code),
    };
  }
}
