-- Migration 012: RLS policy performance + least-privilege function EXECUTE
-- Source: Supabase security/performance advisors run against this project.
-- Idempotent: safe to re-run.

-- ============================================================
-- 1. Initplan wrappers: auth.uid() / is_admin() are STABLE but Postgres
--    re-evaluates them for every scanned row unless they appear inside a
--    sub-select, which lets the planner hoist them into an InitPlan (once).
--    Semantics are unchanged.
-- ============================================================

-- profiles ----------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS profiles_insert_self_or_admin ON public.profiles;
CREATE POLICY profiles_insert_self_or_admin ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id OR (SELECT public.is_admin()));

-- The advisor flagged two permissive UPDATE policies on profiles. A single
-- policy whose USING/WITH CHECK is the OR of the two is exactly equivalent.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_own_or_admin ON public.profiles
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = id OR (SELECT public.is_admin()))
    WITH CHECK ((SELECT auth.uid()) = id OR (SELECT public.is_admin()));

-- stores ------------------------------------------------------
DROP POLICY IF EXISTS stores_insert_self ON public.stores;
CREATE POLICY stores_insert_self ON public.stores
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS stores_update_owner ON public.stores;
CREATE POLICY stores_update_owner ON public.stores
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()))
    WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS stores_delete_owner ON public.stores;
CREATE POLICY stores_delete_owner ON public.stores
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

-- user_addresses / wishlists / carts / cart_items -------------
DROP POLICY IF EXISTS user_addresses_own ON public.user_addresses;
CREATE POLICY user_addresses_own ON public.user_addresses
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS wishlists_own ON public.wishlists;
CREATE POLICY wishlists_own ON public.wishlists
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- FOR ALL stays: it is the only policy that lets a buyer read their own cart.
-- user_id IS NOT NULL must survive in WITH CHECK or anonymous carts could be
-- created with a null owner through the policy.
DROP POLICY IF EXISTS carts_own ON public.carts;
CREATE POLICY carts_own ON public.carts
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id AND user_id IS NOT NULL);

DROP POLICY IF EXISTS cart_items_own_cart ON public.cart_items;
CREATE POLICY cart_items_own_cart ON public.cart_items
    FOR ALL TO authenticated
    USING (cart_id IN (SELECT c.id FROM public.carts c WHERE (SELECT auth.uid()) = c.user_id))
    WITH CHECK (cart_id IN (SELECT c.id FROM public.carts c WHERE (SELECT auth.uid()) = c.user_id));

-- orders / order_items / payments ------------------------------
DROP POLICY IF EXISTS orders_select_owner_or_store_or_admin ON public.orders;
CREATE POLICY orders_select_owner_or_store_or_admin ON public.orders
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id
        OR store_id IN (SELECT public.my_store_ids())
        OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS order_items_select_via_order ON public.order_items;
CREATE POLICY order_items_select_via_order ON public.order_items
    FOR SELECT TO authenticated
    USING (order_id IN (
        SELECT o.id FROM public.orders o
         WHERE (SELECT auth.uid()) = o.user_id
            OR o.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())));

DROP POLICY IF EXISTS payments_select_via_order ON public.payments;
CREATE POLICY payments_select_via_order ON public.payments
    FOR SELECT TO authenticated
    USING (order_id IN (
        SELECT o.id FROM public.orders o
         WHERE (SELECT auth.uid()) = o.user_id
            OR o.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())));

-- product_reviews ----------------------------------------------
DROP POLICY IF EXISTS reviews_insert_self ON public.product_reviews;
CREATE POLICY reviews_insert_self ON public.product_reviews
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS reviews_update_own ON public.product_reviews;
CREATE POLICY reviews_update_own ON public.product_reviews
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS reviews_delete_own ON public.product_reviews;
CREATE POLICY reviews_delete_own ON public.product_reviews
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

-- ============================================================
-- 2. Split FOR ALL write policies into explicit INSERT / UPDATE / DELETE.
--    A FOR ALL policy also answers SELECT, so on these six tables it made two
--    permissive SELECT policies exist at once (the advisor's
--    multiple_permissive_policies finding) and quietly widened the read path.
--    Nothing is lost by removing that read path: every one of these tables
--    already has a *_select policy covering the same rows (categories and
--    blog_categories are qual=true; coupons_select_active, blog_posts_select,
--    product_images_select and product_variants_select all carry an
--    is_admin()/my_store_ids() branch).
--    Postgres takes one command per policy, hence three policies per table.
-- ============================================================

DROP POLICY IF EXISTS categories_admin_write ON public.categories;
CREATE POLICY categories_insert_admin ON public.categories
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY categories_update_admin ON public.categories
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY categories_delete_admin ON public.categories
    FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS coupons_admin_write ON public.coupons;
CREATE POLICY coupons_insert_admin ON public.coupons
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY coupons_update_admin ON public.coupons
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY coupons_delete_admin ON public.coupons
    FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS blog_posts_admin_write ON public.blog_posts;
CREATE POLICY blog_posts_insert_admin ON public.blog_posts
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY blog_posts_update_admin ON public.blog_posts
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY blog_posts_delete_admin ON public.blog_posts
    FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS blog_categories_admin_write ON public.blog_categories;
CREATE POLICY blog_categories_insert_admin ON public.blog_categories
    FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY blog_categories_update_admin ON public.blog_categories
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY blog_categories_delete_admin ON public.blog_categories
    FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS product_images_write_owner ON public.product_images;
CREATE POLICY product_images_insert_owner ON public.product_images
    FOR INSERT TO authenticated
    WITH CHECK (product_id IN (
        SELECT p.id FROM public.products p
         WHERE p.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())));
CREATE POLICY product_images_update_owner ON public.product_images
    FOR UPDATE TO authenticated
    USING (product_id IN (
        SELECT p.id FROM public.products p
         WHERE p.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())))
    WITH CHECK (product_id IN (
        SELECT p.id FROM public.products p
         WHERE p.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())));
CREATE POLICY product_images_delete_owner ON public.product_images
    FOR DELETE TO authenticated
    USING (product_id IN (
        SELECT p.id FROM public.products p
         WHERE p.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())));

DROP POLICY IF EXISTS product_variants_write_owner ON public.product_variants;
CREATE POLICY product_variants_insert_owner ON public.product_variants
    FOR INSERT TO authenticated
    WITH CHECK (product_id IN (
        SELECT p.id FROM public.products p
         WHERE p.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())));
CREATE POLICY product_variants_update_owner ON public.product_variants
    FOR UPDATE TO authenticated
    USING (product_id IN (
        SELECT p.id FROM public.products p
         WHERE p.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())))
    WITH CHECK (product_id IN (
        SELECT p.id FROM public.products p
         WHERE p.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())));
CREATE POLICY product_variants_delete_owner ON public.product_variants
    FOR DELETE TO authenticated
    USING (product_id IN (
        SELECT p.id FROM public.products p
         WHERE p.store_id IN (SELECT public.my_store_ids())
            OR (SELECT public.is_admin())));

-- ============================================================
-- 3. Missing FK indexes (each FK column is filtered by a join or policy).
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_blog_posts_category   ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant    ON public.cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant   ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user  ON public.product_reviews(user_id);

-- ============================================================
-- 4. Pin search_path on the two functions that were missing it, so a
--    attacker-created public.now()/public.uuid_generate_v4() cannot shadow
--    them while the function runs.
-- ============================================================
-- Deliberately VOLATILE: it draws from random(), and a STABLE mark would let
-- the planner fold one draw per query and hand two orders the same number.
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT LANGUAGE plpgsql
SET search_path = public, pg_temp
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
  RETURN 'MDS-' || TO_CHAR(NOW(), 'YYMMDDHH24MISSMS');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Least-privilege EXECUTE.
--    Every function above gets an explicit grant for the roles that actually
--    call it BEFORE PUBLIC is revoked, because those roles currently inherit
--    the right only through PUBLIC.
--      - handle_new_user: fired by GoTrue (supabase_auth_admin) on auth.users.
--      - refresh_*: called only from SECURITY DEFINER triggers owned by postgres.
--      - tg_* / set_updated_at: fired by the writing role, so authenticated and
--        service_role keep EXECUTE; anon never writes these tables.
--      - generate_order_number: only called inside place_order() (definer).
-- ============================================================
GRANT EXECUTE ON FUNCTION public.handle_new_user()
    TO supabase_auth_admin, postgres, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.generate_order_number() TO postgres, service_role;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_product_rating(uuid) TO postgres, service_role;
REVOKE EXECUTE ON FUNCTION public.refresh_product_rating(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_store_stats(uuid) TO postgres, service_role;
REVOKE EXECUTE ON FUNCTION public.refresh_store_stats(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.tg_product_review_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_product_store_stats()   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tg_order_store_stats()     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()           FROM PUBLIC, anon;
