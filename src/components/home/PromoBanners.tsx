'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import type { Banner } from '@/lib/types';

// These strips used to ship fixed Unsplash slides with invented discount claims
// ("Up to 50% Off"). The copy is content now, so it comes from the banners
// table and nothing renders until an admin writes it.

function BannerImage({ banner, className }: { banner: Banner; className: string }) {
  if (!banner.image_url) {
    return <div className={`${className} w-full`} style={{ backgroundColor: banner.background_color ?? '#111827' }} />;
  }
  return (
    <img
      src={banner.image_url}
      alt={banner.title}
      loading="lazy"
      className={`${className} object-cover object-center transition-transform duration-500 group-hover:scale-105`}
    />
  );
}

export function TwoColumnBanners({ banners }: { banners: Banner[] }) {
  const { t } = useTranslation();
  if (banners.length === 0) return null;

  return (
    <section className="py-6 bg-white">
      <div className="modesy-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="relative overflow-hidden rounded-lg group shadow-xs">
              <BannerImage banner={banner} className="w-full h-56 sm:h-64" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent flex flex-col justify-center p-6 sm:p-8 text-white">
                <h4 className="text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">{banner.title}</h4>
                {banner.subtitle && (
                  <p className="text-xs sm:text-sm text-gray-200 mb-4 line-clamp-1 max-w-xs">{banner.subtitle}</p>
                )}
                <div>
                  <Link
                    href={banner.link_url}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition transform group-hover:translate-x-1"
                  >
                    {banner.button_text || t('home.shopNow')} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ThreeColumnBanners({ banners }: { banners: Banner[] }) {
  const { t } = useTranslation();
  if (banners.length === 0) return null;

  return (
    <section className="py-6 bg-gray-50 border-y border-gray-200/60">
      <div className="modesy-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="relative overflow-hidden rounded-lg group h-48">
              <BannerImage banner={banner} className="w-full h-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 text-white">
                <h5 className="font-bold text-lg mb-1">{banner.title}</h5>
                {banner.subtitle && <p className="text-xs text-gray-200 mb-1 line-clamp-2">{banner.subtitle}</p>}
                <Link href={banner.link_url} className="text-xs text-white hover:underline flex items-center gap-1">
                  {banner.button_text || t('common.viewAll')} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
