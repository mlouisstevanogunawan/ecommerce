'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';

export function HeroSlider() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      title: t('home.hero1Title'),
      description: t('home.hero1Subtitle'),
      buttonText: t('home.shopNow'),
      link: '/categories/clothing',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80',
      color: '#222222',
    },
    {
      id: 2,
      title: t('home.hero2Title'),
      description: t('home.hero2Subtitle'),
      buttonText: t('home.shopNow'),
      link: '/categories/accessories',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1600&q=80',
      color: '#222222',
    },
    {
      id: 3,
      title: t('home.hero3Title'),
      description: t('home.hero3Subtitle'),
      buttonText: t('home.shopNow'),
      link: '/categories/shoes',
      image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1600&q=80',
      color: '#222222',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const slide = slides[currentSlide];

  return (
    <div className="relative w-full h-[420px] sm:h-[480px] lg:h-[540px] bg-gray-900 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={slide.image}
          alt={slide.title}
          className="w-full h-full object-cover object-center transition-all duration-700 transform scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Slide Caption */}
      <div className="modesy-container relative h-full flex items-center z-10">
        <div className="max-w-xl text-white space-y-4 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight drop-shadow-md">
            {slide.title}
          </h2>
          <p className="text-base sm:text-lg text-gray-200 drop-shadow">
            {slide.description}
          </p>
          <div className="pt-2">
            <Link
              href={slide.link}
              className="inline-flex items-center px-6 py-3 rounded-md font-bold text-sm tracking-wide text-white transition-all transform hover:-translate-y-0.5 hover:bg-brand! shadow-lg"
              style={{ backgroundColor: slide.color }}
            >
              {slide.buttonText}
            </Link>
          </div>
        </div>
      </div>

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
        {slides.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentSlide(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              currentSlide === idx ? 'w-8 bg-brand' : 'bg-white/50 hover:bg-white'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
