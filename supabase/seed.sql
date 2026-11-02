-- Seed data for Modesy Marketplace — DEVELOPMENT ONLY. Never run against production.
--
-- Idempotent: every statement no-ops when the row already exists, so re-running is safe.
--
-- Prerequisite: the demo logins must exist in auth.users first. On hosted Supabase,
-- writing to auth.users directly is not permitted, so create them with the Auth Admin
-- API (supabase/seed-demo-users.sh does this) or the Supabase dashboard. The
-- on_auth_user_created trigger (migration 005) then makes the matching profiles row.
--
-- Rows that hang off an account (store, review, address) are skipped silently when that
-- account has not been created, so this file works whether you seeded one user or all four.

-- 1. SITE SETTINGS ----------------------------------------------------------
-- Single-row table (unique index from migration 005). The storefront and /contact read
-- it on every request, so without this row both pages error.
INSERT INTO public.site_settings (
    site_title, site_description, contact_email, contact_phone, address,
    currency_code, currency_symbol
)
SELECT 'Modesy - Marketplace',
       'Modesy is a modern e-commerce marketplace where buyers and sellers connect with ease.',
       'support@modesy.dev',
       '+1 619 555 0134',
       '3111 Camino Del Rio N Suite 400, San Diego, CA',
       'USD',
       '$'
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

-- 2. CATEGORIES -------------------------------------------------------------
INSERT INTO public.categories (id, parent_id, name, slug, image_url, sort_order)
VALUES
    ('c0000000-0000-0000-0000-000000000001', NULL, 'Clothing', 'clothing', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80', 1),
    ('c0000000-0000-0000-0000-000000000002', NULL, 'Shoes', 'shoes', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80', 2),
    ('c0000000-0000-0000-0000-000000000003', NULL, 'Home & Living', 'home-living', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80', 3),
    ('c0000000-0000-0000-0000-000000000004', NULL, 'Jewelry & Accessories', 'jewelry-accessories', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80', 4),
    ('c0000000-0000-0000-0000-000000000005', NULL, 'Toys & Entertainment', 'toys-entertainment', 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&q=80', 5),
    ('c0000000-0000-0000-0000-000000000006', NULL, 'Graphics & Photos', 'graphics-photos', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&q=80', 6),
    ('c0000000-0000-0000-0000-000000000007', NULL, 'Video & Audio', 'video-audio', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', 7),
    ('c0000000-0000-0000-0000-000000000008', NULL, 'Web Templates & Code', 'web-templates-code', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80', 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (parent_id, name, slug, image_url, sort_order)
SELECT parent.id, seed.name, seed.slug, seed.image_url, seed.sort_order
  FROM (VALUES
    ('clothing',            'Womens Clothing', 'womens-clothing', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80', 1),
    ('clothing',            'Mens Clothing',   'mens-clothing',   'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80', 2),
    ('shoes',               'Womens Shoes',    'womens-shoes',    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80', 1),
    ('shoes',               'Mens Shoes',      'mens-shoes',      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&q=80', 2),
    ('home-living',         'Home Decor',      'home-decor',      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&q=80', 1),
    ('jewelry-accessories', 'Bags & Purses',   'bags-purses',     'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80', 1)
  ) AS seed(parent_slug, name, slug, image_url, sort_order)
  JOIN public.categories parent ON parent.slug = seed.parent_slug
ON CONFLICT (slug) DO NOTHING;

-- 3. DEMO ACCOUNTS ----------------------------------------------------------
-- Profiles normally come from handle_new_user(). These statements only repair the
-- columns that trigger cannot know about (phone, avatar) and promote the admin.
-- role='admin' is set here, on the server, never through signup metadata (migration 009).
UPDATE public.profiles SET
    full_name = 'Admin Modesy',
    phone = '+1 619 555 0100',
    avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80'
  WHERE email = 'admin@modesy.dev';

UPDATE public.profiles SET role = 'admin'
  WHERE email = 'admin@modesy.dev' AND role <> 'admin';

UPDATE public.profiles SET
    full_name = 'Daniel Jones',
    phone = '+49 30 555 0182',
    avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'
  WHERE email = 'seller@modesy.dev';

UPDATE public.profiles SET role = 'seller'
  WHERE email = 'seller@modesy.dev' AND role <> 'admin';

-- Registration metadata makes this account a customer; the checkout tests need a seller
-- too, so the second buyer stays a customer and the seller owns both demo shops.
UPDATE public.profiles SET
    full_name = 'Jane Doe',
    phone = '+1 619 555 0148',
    avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80'
  WHERE email = 'buyer@modesy.dev';

UPDATE public.profiles SET
    full_name = 'Sam Rivera',
    avatar_url = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80'
  WHERE email = 'buyer2@modesy.dev';

-- 4. STORES -----------------------------------------------------------------
INSERT INTO public.stores (user_id, title, slug, description, phone, address, logo_url, cover_url, is_verified)
SELECT p.id, seed.title, seed.slug, seed.description, seed.phone, seed.address,
       p.avatar_url, seed.cover_url, TRUE
  FROM (VALUES
    ('admin@modesy.dev',  'Official Store', 'official-store',
     'Official merchandise and verified products directly from Modesy.', '+1 619 555 0100',
     'San Diego, USA', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80'),
    ('seller@modesy.dev', 'Trendshop', 'trendshop',
     'High quality fashion, apparel and premium digital designs.', '+49 30 555 0182',
     'Berlin, Germany', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80')
  ) AS seed(owner_email, title, slug, description, phone, address, cover_url)
  JOIN public.profiles p ON p.email = seed.owner_email
ON CONFLICT (slug) DO NOTHING;

UPDATE public.stores s SET user_id = p.id
  FROM public.profiles p
 WHERE p.email = 'seller@modesy.dev' AND s.slug = 'trendshop' AND s.user_id <> p.id;

-- 5. PRODUCTS ---------------------------------------------------------------
-- Slug and sku are the idempotency keys (both UNIQUE), so no artificial ids are needed.
INSERT INTO public.products (
    store_id, category_id, title, slug, sku, description, details,
    price, discount_rate, discounted_price, stock,
    is_digital, is_featured, is_special_offer, status
)
SELECT store.id, cat.id, seed.title, seed.slug, seed.sku, seed.description,
       seed.details::JSONB, seed.price, seed.discount_rate, seed.discounted_price,
       seed.stock, seed.is_digital, seed.is_featured, seed.is_special_offer, 'published'
  FROM (VALUES
    ('trendshop', 'womens-clothing', 'Summer fashion top lace', 'summer-fashion-top-lace-13', 'HSO1Z1OF4',
     'Timeless, modern and feminine pieces made with quality materials. Perfect for warm sunny days and casual elegance.',
     '{"Brand": "H&M", "Condition": "New", "Material": "Lace & Cotton", "Care": "Machine wash cold"}',
     79.00, 18, 65.00, 493, FALSE, TRUE, TRUE),
    ('trendshop', 'graphics-photos', 'Animal colorful digital prints', 'animal-colorful-digital-prints-39', 'DIGI-PRINT-039',
     'High resolution 300 DPI colourful digital artwork. Instant download package with vectors and printable PDF/PNG formats.',
     '{"Format": "PNG, SVG, PDF", "Resolution": "300 DPI", "License": "Commercial"}',
     39.00, 25, 29.00, 999, TRUE, TRUE, TRUE),
    ('trendshop', 'womens-clothing', 'Women lace blouse with different colors', 'women-lace-blouse-with-different-colors-28', 'LACE-BLOUSE-28',
     'Comfortable stylish women lace blouse available in versatile colours. Breathable lightweight fabric for work and weekends.',
     '{"Brand": "Zara", "Condition": "New", "Fit": "Regular"}',
     79.00, 12, 69.00, 240, FALSE, TRUE, TRUE),
    ('official-store', 'womens-clothing', 'Floral women sundress', 'floral-women-sundress-38', 'SUNDRESS-38',
     'Vibrant floral patterned women sundress. Features adjustable straps and an airy silhouette.',
     '{"Brand": "Modesy Studio", "Condition": "New"}',
     89.00, 10, 80.00, 150, FALSE, TRUE, TRUE),
    ('official-store', 'bags-purses', 'Nylon fabric smart backpack', 'nylon-fabric-smart-backpack-7', 'BP-07',
     'Durable waterproof nylon fabric with a modern minimalist aesthetic. Padded 15.6 inch laptop compartment.',
     '{"Capacity": "22L", "Weight": "0.85kg"}',
     69.00, 20, 55.00, 85, FALSE, FALSE, TRUE),
    ('official-store', 'mens-shoes', 'Black sneakers with white sole', 'black-sneakers-with-white-sole-16', 'SNK-BLK-16',
     'Ultra-comfortable daily athletic sneakers featuring a cushioned memory foam insole and breathable knit upper.',
     '{"Sole": "EVA Rubber", "Fit": "True to size"}',
     89.00, 22, 69.00, 310, FALSE, FALSE, TRUE),
    ('official-store', 'bags-purses', 'Woven saddle handbag', 'woven-saddle-handbag-40', 'HB-SADDLE-40',
     'Iconic stylish saddle handbag with an adjustable cross-body shoulder strap and polished golden hardware.',
     '{"Material": "Faux Leather"}',
     69.00, 14, 59.00, 120, FALSE, TRUE, TRUE),
    ('official-store', 'home-decor', 'Handcrafted decorative pillow', 'handcrafted-decorative-pillow-42', 'DEC-PIL-42',
     'Handcrafted bohemian texture pillow with premium hypoallergenic fill. Instantly elevates a living room couch.',
     '{"Dimensions": "45x45 cm", "Material": "Linen Blend"}',
     69.00, 14, 59.00, 90, FALSE, TRUE, TRUE),
    ('trendshop', 'womens-clothing', 'Black midi skirt with white flowers', 'black-midi-skirt-with-white-flowers-41', 'SKT-MIDI-41',
     'Flattering A-line floral midi skirt with an elasticised comfort waistband.',
     '{"Length": "Midi", "Material": "Chiffon"}',
     55.00, 12, 48.00, 175, FALSE, TRUE, FALSE),
    ('trendshop', 'jewelry-accessories', 'Sun hat for women protection cap', 'sun-hat-for-women-protection-cap-17', 'HAT-SUN-17',
     'Wide brim straw woven sun hat with UPF 50+ UV protection.',
     '{"Brim": "12 cm", "Material": "Natural Papyrus"}',
     29.00, 0, 29.00, 60, FALSE, TRUE, FALSE),
    ('trendshop', 'mens-shoes', 'Sneaker shoes men', 'sneaker-shoes-men-30', 'SNK-MEN-30',
     'Sporty running shoes engineered with an air cushion sole and anti-slip tread.',
     '{"Size": "42"}',
     100.00, 11, 89.00, 220, FALSE, TRUE, FALSE),
    ('official-store', 'mens-clothing', 'Cobalt man t-shirt all colors', 'cobalt-man-t-shirt-all-colors-1', 'TSH-COBALT-01',
     '100% combed cotton heavy-gauge basic t-shirt. Pre-shrunk with durable stitching.',
     '{"Grammage": "220 GSM"}',
     35.00, 0, 35.00, 500, FALSE, TRUE, FALSE)
  ) AS seed(store_slug, category_slug, title, slug, sku, description, details,
            price, discount_rate, discounted_price, stock, is_digital, is_featured, is_special_offer)
  JOIN public.stores store ON store.slug = seed.store_slug
  JOIN public.categories cat ON cat.slug = seed.category_slug
ON CONFLICT (slug) DO NOTHING;

-- 6. PRODUCT IMAGES ---------------------------------------------------------
-- product_images has no natural key, so guard on (product, url).
INSERT INTO public.product_images (product_id, image_url, is_primary, sort_order)
SELECT product.id, seed.image_url, seed.is_primary, seed.sort_order
  FROM (VALUES
    ('summer-fashion-top-lace-13',                  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', TRUE,  1),
    ('summer-fashion-top-lace-13',                  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80', FALSE, 2),
    ('summer-fashion-top-lace-13',                  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80', FALSE, 3),
    ('animal-colorful-digital-prints-39',           'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80', TRUE,  1),
    ('animal-colorful-digital-prints-39',           'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=80', FALSE, 2),
    ('women-lace-blouse-with-different-colors-28',  'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80', TRUE,  1),
    ('women-lace-blouse-with-different-colors-28',  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&q=80', FALSE, 2),
    ('floral-women-sundress-38',                    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80', TRUE,  1),
    ('floral-women-sundress-38',                    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80', FALSE, 2),
    ('nylon-fabric-smart-backpack-7',               'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', TRUE,  1),
    ('nylon-fabric-smart-backpack-7',               'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&q=80', FALSE, 2),
    ('black-sneakers-with-white-sole-16',           'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80', TRUE,  1),
    ('black-sneakers-with-white-sole-16',           'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80', FALSE, 2),
    ('woven-saddle-handbag-40',                     'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80', TRUE,  1),
    ('woven-saddle-handbag-40',                     'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80', FALSE, 2),
    ('handcrafted-decorative-pillow-42',            'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80', TRUE,  1),
    ('handcrafted-decorative-pillow-42',            'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?w=800&q=80', FALSE, 2),
    ('black-midi-skirt-with-white-flowers-41',      'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80', TRUE,  1),
    ('sun-hat-for-women-protection-cap-17',         'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=800&q=80', TRUE,  1),
    ('sneaker-shoes-men-30',                        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80', TRUE,  1),
    ('cobalt-man-t-shirt-all-colors-1',             'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80', TRUE,  1)
  ) AS seed(product_slug, image_url, is_primary, sort_order)
  JOIN public.products product ON product.slug = seed.product_slug
 WHERE NOT EXISTS (
   SELECT 1 FROM public.product_images existing
    WHERE existing.product_id = product.id AND existing.image_url = seed.image_url);

-- 7. PRODUCT VARIANTS -------------------------------------------------------
-- Sizes on the demo blouse give the checkout RPC a variant path to exercise.
INSERT INTO public.product_variants (product_id, name, sku, price, discounted_price, stock, attributes)
SELECT product.id, seed.name, product.sku || '-' || seed.name,
       product.price, product.discounted_price, seed.stock,
       jsonb_build_object('Size', seed.name)
  FROM (VALUES
    ('summer-fashion-top-lace-13', 'S',  120),
    ('summer-fashion-top-lace-13', 'M',  150),
    ('summer-fashion-top-lace-13', 'L',  130),
    ('summer-fashion-top-lace-13', 'XL',  93),
    ('women-lace-blouse-with-different-colors-28', 'S', 60),
    ('women-lace-blouse-with-different-colors-28', 'M', 80),
    ('women-lace-blouse-with-different-colors-28', 'L', 55)
  ) AS seed(product_slug, name, stock)
  JOIN public.products product ON product.slug = seed.product_slug
ON CONFLICT (product_id, name) DO NOTHING;

-- 8. SHIPPING ADDRESS -------------------------------------------------------
-- Checkout pre-fills from user_addresses, so the demo buyer needs one.
INSERT INTO public.user_addresses (
    user_id, title, first_name, last_name, phone,
    address_line1, address_line2, country, state, city, postal_code, is_default
)
SELECT p.id, 'Home', 'Jane', 'Doe', '+1 619 555 0148',
       '350 5th Avenue', 'Apt 12B', 'United States', 'California', 'San Diego', '92101', TRUE
  FROM public.profiles p
 WHERE p.email = 'buyer@modesy.dev'
   AND NOT EXISTS (SELECT 1 FROM public.user_addresses a WHERE a.user_id = p.id);

-- 9. REVIEWS ----------------------------------------------------------------
-- Guarded by product_reviews_one_per_user (migration 006).
INSERT INTO public.product_reviews (product_id, user_id, rating, review_text)
SELECT product.id, buyer.id, seed.rating, seed.review_text
  FROM (VALUES
    ('summer-fashion-top-lace-13',        5, 'Absolutely in love with this top. The lace detail is premium and it fits true to size.'),
    ('animal-colorful-digital-prints-39', 5, 'Fantastic print quality. The vector files downloaded instantly without any issues.'),
    ('black-sneakers-with-white-sole-16', 4, 'Comfortable for daily walks. Runs half a size small, so order up.')
  ) AS seed(product_slug, rating, review_text)
  JOIN public.products product ON product.slug = seed.product_slug
  JOIN public.profiles buyer ON buyer.email = 'buyer@modesy.dev'
ON CONFLICT (product_id, user_id) DO NOTHING;

-- 10. BLOG ------------------------------------------------------------------
INSERT INTO public.blog_categories (id, name, slug)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Fashion', 'fashion'),
    ('b0000000-0000-0000-0000-000000000002', 'Business', 'business'),
    ('b0000000-0000-0000-0000-000000000003', 'Life Style', 'life-style')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_posts (category_id, title, slug, content, excerpt, image_url, published)
SELECT cat.id, seed.title, seed.slug, seed.content, seed.excerpt, seed.image_url, TRUE
  FROM (VALUES
    ('fashion', 'Why sustainable fashion matters more than ever', 'why-sustainable-fashion-matters-more-than-ever',
     'Sustainable fashion is more than a trend: it is a shift in how we produce, purchase and care for garments. This guide covers ethical sourcing, circular design and the conscious consumer movement.',
     'Understand the importance of eco-friendly choices in fashion and how you can make a difference.',
     'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&q=80'),
    ('business', 'Must-have accessories to elevate your everyday look', 'must-have-accessories-to-elevate-your-everyday-look',
     'Accessories can transform the simplest jeans and tee into a curated moment. Here are the essential accents for modern sophistication.',
     'Small details make a big difference. Discover the accessories you need right now.',
     'https://images.unsplash.com/photo-1509695503492-413ff191a2e6?w=800&q=80'),
    ('fashion', 'How to pick the right shoes for comfort and style', 'how-to-pick-the-right-shoes-for-comfort-and-style',
     'Finding the sweet spot between ergonomic arch support and footwear aesthetics can feel daunting. Here is the guide to sneakers, boots and loafers.',
     'Find out how to balance fashion and comfort when choosing your footwear.',
     'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80'),
    ('life-style', 'How to choose the perfect outfit for every occasion', 'how-to-choose-the-perfect-outfit-for-every-occasion',
     'From business summits to beachfront brunches, master the art of effortless dressing.',
     'Learn how to style yourself for casual, formal and special events.',
     'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80')
  ) AS seed(category_slug, title, slug, content, excerpt, image_url)
  JOIN public.blog_categories cat ON cat.slug = seed.category_slug
ON CONFLICT (slug) DO NOTHING;

-- 11. COUPONS ---------------------------------------------------------------
INSERT INTO public.coupons (code, discount_percent, min_order_amount, is_active)
VALUES
    ('MODESY10', 10, 50.00, TRUE),
    ('WELCOME20', 20, 100.00, TRUE)
ON CONFLICT (code) DO NOTHING;
