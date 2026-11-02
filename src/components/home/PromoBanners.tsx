'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function TwoColumnBanners() {
  return (
    <section className="py-6 bg-white">
      <div className="modesy-container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Banner 1 */}
          <div className="relative overflow-hidden rounded-lg group shadow-xs">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80"
              alt="Summer Clearance"
              className="w-full h-56 sm:h-64 object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent flex flex-col justify-center p-6 sm:p-8 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">
                Summer Collection
              </span>
              <h4 className="text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">
                Up to 50% Off<br />Women Fashion
              </h4>
              <p className="text-xs sm:text-sm text-gray-200 mb-4 line-clamp-1 max-w-xs">
                Lightweight fabrics, trendy tops, skirts, and dresses.
              </p>
              <div>
                <Link
                  href="/categories/clothing"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-bold transition transform group-hover:translate-x-1"
                >
                  Shop Now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Banner 2 */}
          <div className="relative overflow-hidden rounded-lg group shadow-xs">
            <img
              src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=80"
              alt="Footwear Trends"
              className="w-full h-56 sm:h-64 object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent flex flex-col justify-center p-6 sm:p-8 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                New Arrivals
              </span>
              <h4 className="text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">
                Trending Shoes &<br />Sneakers 2026
              </h4>
              <p className="text-xs sm:text-sm text-gray-200 mb-4 line-clamp-1 max-w-xs">
                Designed for ultimate all-day comfort and aesthetic look.
              </p>
              <div>
                <Link
                  href="/categories/shoes"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded text-xs font-bold transition transform group-hover:translate-x-1"
                >
                  Discover More <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ThreeColumnBanners() {
  return (
    <section className="py-6 bg-gray-50 border-y border-gray-200/60">
      <div className="modesy-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="relative overflow-hidden rounded-lg group h-48">
            <img
              src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80"
              alt="Home Decor"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs text-brand font-bold uppercase">Modern Living</span>
              <h5 className="font-bold text-lg mb-1">Home Decor & Lights</h5>
              <Link href="/categories/home-living" className="text-xs text-white hover:underline flex items-center gap-1">
                Explore Collection <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="relative overflow-hidden rounded-lg group h-48">
            <img
              src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80"
              alt="Jewelry & Accessories"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs text-rose-400 font-bold uppercase">Elegant Style</span>
              <h5 className="font-bold text-lg mb-1">Luxury Jewelry & Bags</h5>
              <Link href="/categories/jewelry-accessories" className="text-xs text-white hover:underline flex items-center gap-1">
                Explore Collection <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="relative overflow-hidden rounded-lg group h-48">
            <img
              src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&q=80"
              alt="Digital Products"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs text-blue-400 font-bold uppercase">Digital Assets</span>
              <h5 className="font-bold text-lg mb-1">Web Themes & Graphics</h5>
              <Link href="/categories/web-templates-code" className="text-xs text-white hover:underline flex items-center gap-1">
                Instant Download <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
