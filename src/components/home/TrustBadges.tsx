'use client';

import React from 'react';
import { Truck, RotateCcw, Headphones, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';

export function TrustBadges() {
  const { t } = useTranslation();

  const badges = [
    {
      icon: Truck,
      title: t('home.trustBadges.freeShippingTitle'),
      subtitle: t('home.trustBadges.freeShippingDesc'),
    },
    {
      icon: RotateCcw,
      title: t('home.trustBadges.moneyBackTitle'),
      subtitle: t('home.trustBadges.moneyBackDesc'),
    },
    {
      icon: Headphones,
      title: t('home.trustBadges.supportTitle'),
      subtitle: t('home.trustBadges.supportDesc'),
    },
    {
      icon: ShieldCheck,
      title: t('home.trustBadges.securePaymentTitle'),
      subtitle: t('home.trustBadges.securePaymentDesc'),
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
