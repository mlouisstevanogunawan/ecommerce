'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LocaleConfig,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  getLocaleConfig,
  isValidLocale,
} from '@/lib/i18n/config';

type MessagesDictionary = Record<string, any>;

interface I18nContextValue {
  locale: string;
  config: LocaleConfig;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (code: string) => void;
  formatDate: (dateString: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// Helper to resolve nested dotted key e.g. "home.trustBadges.freeShippingTitle"
function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  messages = {},
}: {
  children: React.ReactNode;
  initialLocale?: string;
  messages: MessagesDictionary;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<string>(
    isValidLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE
  );

  const config = useMemo(() => getLocaleConfig(locale), [locale]);

  const setLocale = useCallback(
    (newLocale: string) => {
      if (!isValidLocale(newLocale) || newLocale === locale) return;
      setLocaleState(newLocale);

      // Persist in cookie (1 year expiry)
      document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

      // Update document HTML lang attribute immediately
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLocale;
      }

      // Refresh server components to re-render with new translations
      router.refresh();
    },
    [locale, router]
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const raw = getNestedValue(messages, key);
      if (raw === undefined) {
        // Fallback to key basename or key itself if missing
        return key.split('.').pop() || key;
      }

      if (!params) return raw;

      return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }, raw);
    },
    [messages]
  );

  const formatDate = useCallback(
    (dateString: string): string => {
      try {
        const d = new Date(dateString);
        return d.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        return dateString;
      }
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      config,
      t,
      setLocale,
      formatDate,
    }),
    [locale, config, t, setLocale, formatDate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
