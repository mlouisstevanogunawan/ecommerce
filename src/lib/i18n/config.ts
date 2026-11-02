export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string; // ISO 3166-1 alpha-2 for flag rendering or display
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: 'US',
  },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    flag: 'ID',
  },
];

export const DEFAULT_LOCALE = 'en';
export const LOCALE_COOKIE_NAME = 'modesy_locale';

export function getLocaleConfig(code: string): LocaleConfig {
  const found = SUPPORTED_LOCALES.find(
    (l) => l.code.toLowerCase() === (code || '').toLowerCase()
  );
  return found || SUPPORTED_LOCALES[0];
}

export function isValidLocale(code: string): boolean {
  return SUPPORTED_LOCALES.some(
    (l) => l.code.toLowerCase() === (code || '').toLowerCase()
  );
}
