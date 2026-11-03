'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CurrencyConfig,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  CURRENCY_COOKIE_NAME,
  getCurrencyConfig,
  isValidCurrency,
} from '@/lib/currency/config';

interface CurrencyContextValue {
  currency: string;
  config: CurrencyConfig;
  rates: Record<string, number>;
  exchangeRate: number;
  isFallback: boolean;
  // 'approximate' means the number on screen is not today's market rate: either the
  // rate API never answered or it answered without this currency.
  rateSource: 'live' | 'approximate';
  setCurrency: (code: string) => void;
  formatPrice: (amountInUSD: number, customCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({
  children,
  initialCurrency = DEFAULT_CURRENCY,
  initialRates = { USD: 1 },
  isFallback = false,
  missingRates = [],
}: {
  children: React.ReactNode;
  initialCurrency?: string;
  initialRates?: Record<string, number>;
  isFallback?: boolean;
  missingRates?: string[];
}) {
  const router = useRouter();
  const [currency, setCurrencyState] = useState<string>(
    isValidCurrency(initialCurrency) ? initialCurrency : DEFAULT_CURRENCY
  );
  const [rates] = useState<Record<string, number>>(initialRates);

  const config = useMemo(() => getCurrencyConfig(currency), [currency]);
  const exchangeRate = useMemo(() => rates[currency] || 1, [rates, currency]);
  const rateSource: 'live' | 'approximate' =
    currency === DEFAULT_CURRENCY || !missingRates.includes(currency) ? 'live' : 'approximate';

  const setCurrency = useCallback(
    (newCurrency: string) => {
      if (!isValidCurrency(newCurrency) || newCurrency === currency) return;
      setCurrencyState(newCurrency);

      // Persist in cookie (1 year expiry)
      document.cookie = `${CURRENCY_COOKIE_NAME}=${newCurrency}; path=/; max-age=31536000; SameSite=Lax`;

      // Refresh server components to render new currency
      router.refresh();
    },
    [currency, router]
  );

  const formatPrice = useCallback(
    (amountInUSD: number, customCurrency?: string): string => {
      const targetCode = customCurrency || currency;
      const targetConfig = getCurrencyConfig(targetCode);
      const rate = rates[targetCode] || 1;
      const converted = amountInUSD * rate;

      try {
        const formatter = new Intl.NumberFormat(targetConfig.locale, {
          style: 'currency',
          currency: targetConfig.code,
          minimumFractionDigits: targetConfig.decimals,
          maximumFractionDigits: targetConfig.decimals,
        });
        return formatter.format(converted);
      } catch {
        return `${targetConfig.symbol}${converted.toFixed(targetConfig.decimals)}`;
      }
    },
    [currency, rates]
  );

  const value = useMemo(
    () => ({
      currency,
      config,
      rates,
      exchangeRate,
      isFallback,
      rateSource,
      setCurrency,
      formatPrice,
    }),
    [currency, config, rates, exchangeRate, isFallback, rateSource, setCurrency, formatPrice]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
