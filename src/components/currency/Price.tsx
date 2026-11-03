'use client';

import { useCurrency } from './CurrencyProvider';

interface PriceProps {
  amount: number | null | undefined;
  className?: string;
  currency?: string;
}

export function Price({ amount, className = '', currency }: PriceProps) {
  const { formatPrice } = useCurrency();

  if (amount === null || amount === undefined || isNaN(amount)) {
    return <span className={className}>-</span>;
  }

  const formatted = formatPrice(amount, currency);

  return <span className={className}>{formatted}</span>;
}

export default Price;
