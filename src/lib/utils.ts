import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getCurrencyConfig } from './currency/config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const config = getCurrencyConfig(currency);
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toFixed(config.decimals)}`;
  }
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export function formatDate(dateString: string, locale: string = 'en-US'): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(locale === 'id' ? 'id-ID' : locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

