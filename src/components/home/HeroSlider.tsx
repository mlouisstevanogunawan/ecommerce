'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import type { Banner } from '@/lib/types';

const FALLBACK_BUTTON_COLOR = '#222222';

export function HeroSlider({ banners }: { banners: Banner[] }) {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  // Banners can change between renders (ISR revalidation), so the stored index
  // is clamped instead of trusted.
  const index = Math.min(currentSlide, banners.length - 1);
  const slide = banners[index];

  const prevSlide = () => {
    setCurrentSlide((prev) => (index === 0 ? banners.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (index === banners.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full h-[420px] sm:h-[480px] lg:h-[540px] bg-gray-900 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: slide.background_color ?? FALLBACK_BUTTON_COLOR }}>
        {slide.image_url && (
          <>
            <img
              src={slide.image_url}
              alt={slide.title}
              className="w-full h-full object-cover object-center transition-all duration-700 transform scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </>
        )}
      </div>

      {/* Slide Caption */}
      <div className="modesy-container relative h-full flex items-center z-10">
        <div className="max-w-xl text-white space-y-4 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight drop-shadow-md">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="text-base sm:text-lg text-gray-200 drop-shadow">{slide.subtitle}</p>
          )}
          <div className="pt-2">
            <Link
              href={slide.link_url}
              className="inline-flex items-center px-6 py-3 rounded-md font-bold text-sm tracking-wide text-white transition-all transform hover:-translate-y-0.5 hover:bg-brand! shadow-lg"
              style={{ backgroundColor: slide.background_color ?? FALLBACK_BUTTON_COLOR }}
            >
              {slide.button_text || t('home.shopNow')}
            </Link>
          </div>
        </div>
      </div>

      {banners.length > 1 && (
        <>
          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white text-white hover:text-gray-900 flex items-center justify-center backdrop-blur-xs transition z-20"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white text-white hover:text-gray-900 flex items-center justify-center backdrop-blur-xs transition z-20"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Slide Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
            {banners.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === idx ? 'w-8 bg-brand' : 'bg-white/50 hover:bg-white'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
