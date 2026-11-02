import React from 'react';
import { HeroSlider } from '@/components/home/HeroSlider';
import { CategoryCircles } from '@/components/home/CategoryCircles';
import { SpecialOffers } from '@/components/home/SpecialOffers';
import { TwoColumnBanners, ThreeColumnBanners } from '@/components/home/PromoBanners';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { LatestBlogSection } from '@/components/home/LatestBlogSection';
import { TrustBadges } from '@/components/home/TrustBadges';
import {
  getCategories,
  getProducts,
  getSpecialOffers,
  getFeaturedProducts,
  getBlogPosts,
} from '@/lib/supabase/data';

export const revalidate = 60; // ISR cache revalidation

export default async function HomePage() {
  const [categories, allProducts, specialOffers, featuredProducts, blogPosts] = await Promise.all([
    getCategories(),
    getProducts(),
    getSpecialOffers(),
    getFeaturedProducts(),
    getBlogPosts(),
  ]);

  const clothingCategory = categories.find((c) => c.slug === 'clothing') || categories[0];
  const shoesCategory = categories.find((c) => c.slug === 'shoes') || categories[1];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 1. Hero Carousel Banner Slider */}
      <HeroSlider />

      {/* 2. Shop By Category Round Circles */}
      <CategoryCircles categories={categories} />

      {/* 3. Special Offers Limited Time Deals */}
      <SpecialOffers products={specialOffers} />

      {/* 4. Two Promo Banners */}
      <TwoColumnBanners />

      {/* 5. Featured Products with Dynamic Tabs & Load More */}
      <FeaturedProducts products={featuredProducts.length > 0 ? featuredProducts : allProducts} />

      {/* 6. Three Category Secondary Banners */}
      <ThreeColumnBanners />

      {/* 7. Clothing Showcase */}
      {clothingCategory && (
        <CategoryShowcase
          category={clothingCategory}
          products={allProducts}
          bannerImage="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80"
          bannerTitle="Summer Fashion Tops & Outfits"
          bannerSubtitle="Discover trendy styles, premium lace and modern casual wear"
        />
      )}

      {/* 8. Shoes & Footwear Showcase */}
      {shoesCategory && (
        <CategoryShowcase
          category={shoesCategory}
          products={allProducts}
          bannerImage="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80"
          bannerTitle="Casual Sneakers & Boots"
          bannerSubtitle="Durable comfort and lightweight shoes designed for everyday life"
        />
      )}

      {/* 9. Latest Blog Posts */}
      <LatestBlogSection posts={blogPosts} />

      {/* 10. Trust & Guarantees Badges */}
      <TrustBadges />
    </div>
  );
}
