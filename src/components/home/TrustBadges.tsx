'use client';

import { Truck, Headphones, MessageCircle, CircleDollarSign } from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { useCurrency } from '@/components/currency/CurrencyProvider';

interface TrustBadgesProps {
  // Threshold in USD, straight from public.checkout_rules().
  freeShippingThreshold: number;
}

export function TrustBadges({ freeShippingThreshold }: TrustBadgesProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const badges = [
    {
      icon: Truck,
      title: t('home.trustBadges.freeShippingTitle'),
      subtitle: t('home.trustBadges.freeShippingDesc', {
        amount: formatPrice(freeShippingThreshold),
      }),
    },
    {
      icon: Headphones,
      title: t('home.trustBadges.supportTitle'),
      subtitle: t('home.trustBadges.supportDesc'),
    },
    {
      icon: MessageCircle,
      title: t('home.trustBadges.sellerContactTitle'),
      subtitle: t('home.trustBadges.sellerContactDesc'),
    },
    {
      icon: CircleDollarSign,
      title: t('home.trustBadges.currencyTitle'),
      subtitle: t('home.trustBadges.currencyDesc'),
    },
  ];

  return (
    <section className="py-8 bg-white border-t border-gray-100">
      <div className="modesy-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100 transition hover:shadow-xs"
              >
                <div className="w-12 h-12 rounded-full bg-teal-50 text-brand flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-gray-900 leading-snug">{b.title}</h5>
                  <p className="text-xs text-gray-500 mt-0.5">{b.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
