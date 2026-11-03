import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cookies, headers } from 'next/headers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartProvider } from '@/components/cart/CartProvider';
import { AddedToCartModal } from '@/components/cart/AddedToCartModal';
import { CookiesWarning } from '@/components/layout/CookiesWarning';
import { ScrollUpButton } from '@/components/layout/ScrollUpButton';
import { getCategories, getSiteSettings } from '@/lib/supabase/data';
import { getExchangeRates } from '@/lib/currency/rates';
import { CurrencyProvider } from '@/components/currency/CurrencyProvider';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import { isValidCurrency, DEFAULT_CURRENCY, CURRENCY_COOKIE_NAME } from '@/lib/currency/config';
import { isValidLocale, DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from '@/lib/i18n/config';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// The title and description are the admin-editable site settings, not a
// hardcoded string, so /admin/settings is the only place they are written.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.site_title,
    description: settings.site_description,
    keywords: 'marketplace, e-commerce, shop, multi-vendor, buy, sell',
    openGraph: {
      title: settings.site_title,
      description: settings.site_description,
      type: 'website',
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, settings, cookieStore, headerList, ratesData] = await Promise.all([
    getCategories(),
    getSiteSettings(),
    cookies(),
    headers(),
    getExchangeRates(),
  ]);

  const acceptLang = headerList.get('accept-language') || '';
  const isIndonesianUser = acceptLang.toLowerCase().includes('id');

  const rawCurrency = cookieStore.get(CURRENCY_COOKIE_NAME)?.value;
  const currency = rawCurrency && isValidCurrency(rawCurrency)
    ? rawCurrency
    : (isIndonesianUser ? 'IDR' : DEFAULT_CURRENCY);

  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = rawLocale && isValidLocale(rawLocale)
    ? rawLocale
    : (isIndonesianUser ? 'id' : DEFAULT_LOCALE);

  // Load only the active locale messages server-side
  const messages = locale === 'id'
    ? (await import('../../messages/id.json')).default
    : (await import('../../messages/en.json')).default;

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex flex-col min-h-screen font-sans antialiased bg-white text-gray-900">
        <I18nProvider initialLocale={locale} messages={messages}>
          <CurrencyProvider
            initialCurrency={currency}
            initialRates={ratesData.rates}
            isFallback={ratesData.isFallback}
            missingRates={ratesData.missing ?? []}
          >
            <CartProvider>
              <Header categories={categories} />
              <main className="flex-1">{children}</main>
              <Footer categories={categories} settings={settings} />
              <AddedToCartModal />
              <CookiesWarning />
              <ScrollUpButton />
            </CartProvider>
          </CurrencyProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
