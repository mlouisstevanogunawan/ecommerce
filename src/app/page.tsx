import { HeroSlider } from '@/components/home/HeroSlider';
import { CategoryCircles } from '@/components/home/CategoryCircles';
import { SpecialOffers } from '@/components/home/SpecialOffers';
import { TwoColumnBanners, ThreeColumnBanners } from '@/components/home/PromoBanners';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { LatestBlogSection } from '@/components/home/LatestBlogSection';
import { TrustBadges } from '@/components/home/TrustBadges';
import type { Category } from '@/lib/types';
import {
  getBanners,
  getCategories,
  getCheckoutRules,
  getProducts,
  getSpecialOffers,
  getFeaturedProducts,
  getBlogPosts,
} from '@/lib/supabase/data';

export const revalidate = 60; // ISR cache revalidation

export default async function HomePage() {
  const [categories, allProducts, specialOffers, featuredProducts, blogPosts, rules, hero, promoTwo, promoThree, showcases] =
    await Promise.all([
      getCategories(),
      getProducts(),
      getSpecialOffers(),
      getFeaturedProducts(),
      getBlogPosts(),
      getCheckoutRules(),
      getBanners('hero'),
      getBanners('promo_two'),
      getBanners('promo_three'),
      getBanners('category_showcase'),
    ]);

  // The two showcase sections are the first two categories that actually have
  // published products, so nothing renders for an empty category. A parent
  // category counts its own subcategories, because products hang off the leaf.
  const hasProducts = (category: Category) =>
    allProducts.some(
      (p) => p.category_id === category.id || (category.children ?? []).some((sub) => sub.id === p.category_id),
    );
  const showcaseCategories = categories.filter(hasProducts).slice(0, 2);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 1. Hero Carousel Banner Slider */}
      <HeroSlider banners={hero} />

      {/* 2. Shop By Category Round Circles */}
      <CategoryCircles categories={categories} />

      {/* 3. Special Offers Limited Time Deals */}
      <SpecialOffers products={specialOffers} />

      {/* 4. Two Promo Banners */}
      <TwoColumnBanners banners={promoTwo} />

      {/* 5. Featured Products with Dynamic Tabs & Load More */}
      <FeaturedProducts products={featuredProducts.length > 0 ? featuredProducts : allProducts} />

      {/* 6. Three Category Secondary Banners */}
      <ThreeColumnBanners banners={promoThree} />

      {/* 7. Category Showcases */}
      {showcaseCategories.map((category) => (
        <CategoryShowcase
          key={category.id}
          category={category}
          products={allProducts}
          banner={showcases.find((b) => b.category_id === category.id) ?? null}
        />
      ))}

      {/* 8. Latest Blog Posts */}
      <LatestBlogSection posts={blogPosts} />

      {/* 9. Store Facts Badges */}
      <TrustBadges freeShippingThreshold={rules.free_shipping_threshold} />
    </div>
  );
}
