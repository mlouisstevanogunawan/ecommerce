-- Migration 005: Schema completion
--
-- Brings the schema defined by 001-004 up to what the application code actually needs:
-- aggregate columns, uniqueness/validity constraints the code assumed, missing indexes,
-- updated_at maintenance, profile-on-signup, and a collision-safe order number generator.
--
-- Safe to re-run. Intended to run on an empty or freshly-created database (the project
-- currently has no tables), so every statement here is additive.

-- gen_random_uuid() is core Postgres since 13, so no extension is needed here.
-- pgcrypto is only required for the bcrypt helper used by seed/demo-user creation;
-- create it tolerantly because its schema differs between hosted and local projects.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pgcrypto not created (%); demo users must be made via the Auth Admin API', SQLERRM;
    END;
  END;
END $$;

-- Same updated_at maintenance helper for every table that declares updated_at.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles', 'stores', 'products', 'carts', 'orders', 'site_settings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Aggregate columns the frontend renders but 001 never defined.
-- ProductCard / ProductDetailView read product.rating and product.reviews_count;
-- shop pages and the seller dashboard read store.products_count / sales_count / rating.
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count INT NOT NULL DEFAULT 0 CHECK (reviews_count >= 0);

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS products_count INT NOT NULL DEFAULT 0 CHECK (products_count >= 0),
  ADD COLUMN IF NOT EXISTS sales_count INT NOT NULL DEFAULT 0 CHECK (sales_count >= 0),
  ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_revenue >= 0),
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count INT NOT NULL DEFAULT 0 CHECK (reviews_count >= 0);

-- Site-wide money invariants. 001 checked individual columns but not the relationship
-- the checkout formula depends on, so a bad row could make total < 0 or a discount
-- exceed the subtotal without any error.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_discount_within_price;
ALTER TABLE public.products ADD CONSTRAINT products_discount_within_price
  CHECK (discounted_price <= price);

ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_discount_within_price;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_discount_within_price
  CHECK (discounted_price <= price);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_totals_are_non_negative;
ALTER TABLE public.orders ADD CONSTRAINT orders_totals_are_non_negative
  CHECK (subtotal >= 0 AND discount >= 0 AND shipping_fee >= 0 AND total >= 0);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_discount_not_above_subtotal;
ALTER TABLE public.orders ADD CONSTRAINT orders_discount_not_above_subtotal
  CHECK (discount <= subtotal + shipping_fee);

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_one_form_required;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_one_form_required
  CHECK (discount_percent IS NOT NULL OR discount_amount IS NOT NULL);

-- A row with neither is neither a guest cart nor a user cart, and the CHECK in 001
-- allowed it; user_addresses had no guarantee of exactly one default per user.
ALTER TABLE public.user_addresses DROP CONSTRAINT IF EXISTS user_addresses_postal_not_blank;
ALTER TABLE public.user_addresses ADD CONSTRAINT user_addresses_postal_not_blank
  CHECK (length(trim(postal_code)) > 0);

CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_one_default_per_user
  ON public.user_addresses (user_id) WHERE is_default;

-- Cart lines must collapse per (cart, product, variant) or quantity edits duplicate rows.
-- The literal stands in for "no variant" because a UNIQUE index ignores NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_one_line_per_variant
  ON public.cart_items (cart_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- One cart per signed-in user; guests are not persisted (see migration 006 RLS).
CREATE UNIQUE INDEX IF NOT EXISTS carts_one_per_user
  ON public.carts (user_id) WHERE user_id IS NOT NULL;

-- SKUs are business-unique identifiers; the seller form offers no way to set one,
-- so the generator in the app must be prevented from colliding silently.
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON public.products (sku);

-- Site settings is a single-row table by design; nothing in 001 enforced that.
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_single_row ON public.site_settings ((TRUE));

-- ---------------------------------------------------------------------------
-- Review aggregates. SECURITY DEFINER because a customer posting a review has no
-- UPDATE grant on products, so an INVOKER trigger would abort the insert.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_product_rating(p_product_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE products
     SET rating = COALESCE((
           SELECT ROUND(AVG(pr.rating)::NUMERIC, 2)
             FROM product_reviews pr
            WHERE pr.product_id = p_product_id), 0),
         reviews_count = (
           SELECT COUNT(*)::INT
             FROM product_reviews pr
            WHERE pr.product_id = p_product_id)
   WHERE id = p_product_id;
$$;

CREATE OR REPLACE FUNCTION public.tg_product_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_product_rating(OLD.product_id);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_product_rating(NEW.product_id);
  IF TG_OP = 'UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
    PERFORM public.refresh_product_rating(OLD.product_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_review_stats ON public.product_reviews;
CREATE TRIGGER trg_product_review_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_product_review_stats();

-- ---------------------------------------------------------------------------
-- Store aggregates: catalogue size from products, revenue from settled orders.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_store_stats(p_store_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE stores s
     SET products_count = (
           SELECT COUNT(*) FROM products p
            WHERE p.store_id = s.id AND p.status = 'published'),
         sales_count = (
           SELECT COALESCE(SUM(oi.quantity), 0)::INT FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
            WHERE o.store_id = s.id AND o.payment_status = 'paid'),
         total_revenue = (
           SELECT COALESCE(SUM(o.total), 0) FROM orders o
            WHERE o.store_id = s.id AND o.payment_status = 'paid'),
         rating = COALESCE((
           SELECT ROUND(AVG(pr.rating)::NUMERIC, 2) FROM product_reviews pr
             JOIN products p ON p.id = pr.product_id
            WHERE p.store_id = s.id), 0),
         reviews_count = COALESCE((
           SELECT COUNT(*) FROM product_reviews pr
             JOIN products p ON p.id = pr.product_id
            WHERE p.store_id = s.id), 0)
   WHERE s.id = p_store_id;
$$;

CREATE OR REPLACE FUNCTION public.tg_product_store_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_store_stats(OLD.store_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_store_stats(NEW.store_id);
    IF TG_OP = 'UPDATE' AND NEW.store_id IS DISTINCT FROM OLD.store_id THEN
      PERFORM public.refresh_store_stats(OLD.store_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_product_store_stats ON public.products;
CREATE TRIGGER trg_product_store_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_product_store_stats();

CREATE OR REPLACE FUNCTION public.tg_order_store_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    PERFORM public.refresh_store_stats(NEW.store_id);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.store_id IS DISTINCT FROM NEW.store_id THEN
    PERFORM public.refresh_store_stats(OLD.store_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_store_stats ON public.orders;
CREATE TRIGGER trg_order_store_stats
  AFTER INSERT OR UPDATE OF payment_status, store_id ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_order_store_stats();

-- ---------------------------------------------------------------------------
-- Profile is created by the database, never by the client. Without this the app
-- has no profiles row after signup, so no role, so seller/admin are unreachable.
-- role is read from auth metadata; an out-of-range value silently becomes
-- 'customer' rather than raising, so a bad metadata key can never mint an admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url',
    CASE NEW.raw_user_meta_data ->> 'role'
      WHEN 'seller' THEN 'seller'::user_role
      WHEN 'admin'  THEN 'admin'::user_role
      ELSE 'customer'::user_role
    END
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Order numbers are shown in the UI and used to look up orders, so they must be
-- unique and not a bare sequence (MDS-000001 is enumerable). Random 6-digit with
-- a retry loop against the UNIQUE index added by 001.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  candidate TEXT;
  attempts INT := 0;
BEGIN
  WHILE attempts < 25 LOOP
    attempts := attempts + 1;
    candidate := 'MDS-' || (100000 + (floor(random() * 900000))::INT)::TEXT;
    IF NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.order_number = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
  -- Extremely unlikely; fall back to a timestamp suffix that cannot collide.
  RETURN 'MDS-' || TO_CHAR(NOW(), 'YYMMDDHH24MISSMS');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Indexes on foreign keys and the filters the query layer actually applies.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_stores_user ON public.stores (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON public.product_images (product_id) WHERE is_primary;
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_products_discounted_price ON public.products (discounted_price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON public.products (category_id, status);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON public.wishlists (product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.cart_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders (lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_created ON public.blog_posts (published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON public.contact_messages (status, created_at DESC);

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates the profiles row for a new auth.users row; role comes from user metadata and defaults to customer.';
COMMENT ON FUNCTION public.generate_order_number() IS 'Returns an unused MDS-<6 digit> order number; retried by the caller inside the insert transaction.';
COMMENT ON COLUMN public.products.rating IS 'Maintained by trg_product_review_stats; not writable from the API.';
COMMENT ON COLUMN public.stores.total_revenue IS 'Sum of orders.total where payment_status = paid; maintained by trigger.';
