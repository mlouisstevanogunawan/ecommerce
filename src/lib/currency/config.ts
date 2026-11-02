export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimals: 2,
  },
  {
    code: 'IDR',
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    locale: 'id-ID',
    decimals: 0,
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    decimals: 2,
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    decimals: 2,
  },
  {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    locale: 'ja-JP',
    decimals: 0,
  },
  {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    locale: 'en-SG',
    decimals: 2,
  },
  {
    code: 'MYR',
    symbol: 'RM',
    name: 'Malaysian Ringgit',
    locale: 'ms-MY',
    decimals: 2,
  },
  {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    locale: 'en-AU',
    decimals: 2,
  },
];

export const DEFAULT_CURRENCY = 'USD';
export const CURRENCY_COOKIE_NAME = 'modesy_currency';

export function getCurrencyConfig(code: string): CurrencyConfig {
  const found = SUPPORTED_CURRENCIES.find(
    (c) => c.code.toUpperCase() === (code || '').toUpperCase()
  );
  return found || SUPPORTED_CURRENCIES[0];
}

export function isValidCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.some(
    (c) => c.code.toUpperCase() === (code || '').toUpperCase()
  );
}
