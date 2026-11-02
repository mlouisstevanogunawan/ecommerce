-- Migration 006: Row Level Security hardening
--
-- Replaces the policies from 002 with least-privilege rules. Migration 002 is left
-- untouched; this file drops its policies by name and re-creates them, so the final
-- state is defined here and applying 002 then 006 is the supported order.
--
-- Three holes in 002 this closes:
--   * carts/cart_items allowed ANY authenticated user to touch every guest cart
--     ("OR user_id IS NULL"). Guests are no longer persisted server-side at all.
--   * orders/order_items had INSERT WITH CHECK (true), so an anonymous caller could
--     create an order under any user_id and then read it back through the SELECT
--     policy. Order creation now happens only inside the place_order() RPC.
--   * profiles was SELECT-able by everyone, publishing every account's email address.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Helpers. STABLE so the planner evaluates them once per row rather than
-- re-running the definition; search_path pinned because they are DEFINER.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = auth.uid() AND p.role IN ('seller', 'admin')
  );
$$;

-- Stores the caller owns. Used instead of repeating the subquery in six policies.
CREATE OR REPLACE FUNCTION public.my_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.id FROM public.stores s WHERE s.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(), public.is_seller(), public.my_store_ids() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Drop every policy 002 created, then define the replacement set.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES ---------------------------------------------------------------
-- Own row, or admin. Public-facing identity (name + avatar, for shop pages and
-- review authorship) is served by the profile_public view below, never by email.
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());
COMMENT ON POLICY profiles_select_own_or_admin ON public.profiles IS
  'A user sees their own profile including email; admins see all. Everyone else is served profile_public.';

CREATE POLICY profiles_insert_self_or_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());
COMMENT ON POLICY profiles_insert_self_or_admin ON public.profiles IS
  'Normally unnecessary: handle_new_user() creates the row. Kept so an admin can repair a missing profile.';

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
COMMENT ON POLICY profiles_update_own ON public.profiles IS
  'Own row only. Role escalation is additionally blocked by the column-level UPDATE grant below.';

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Column-level defence: even through profiles_update_own, authenticated may not write
-- role or email. Only service_role (server code) and the trigger can change a role.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, phone, updated_at) ON public.profiles TO authenticated;

-- Public identity projection. security_invoker=false lets the view read profiles
-- without exposing the underlying columns to anon.
DROP VIEW IF EXISTS public.profile_public;
CREATE VIEW public.profile_public
WITH (security_invoker = false)
AS
  SELECT id, full_name, avatar_url, created_at
    FROM public.profiles;

ALTER VIEW public.profile_public OWNER TO postgres;
REVOKE ALL ON public.profile_public FROM PUBLIC;
GRANT SELECT ON public.profile_public TO anon, authenticated, service_role;

COMMENT ON VIEW public.profile_public IS
  'Non-sensitive identity columns, readable by anyone. product_reviews and shop pages embed this instead of profiles.';

-- 2. STORES ------------------------------------------------------------------
CREATE POLICY stores_select_public ON public.stores
  FOR SELECT TO anon, authenticated
  USING (true);
COMMENT ON POLICY stores_select_public ON public.stores IS
  'Shop pages are public storefronts; stores carries no personal data beyond seller-supplied text.';

CREATE POLICY stores_insert_self ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY stores_update_owner ON public.stores
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
COMMENT ON POLICY stores_update_owner ON public.stores IS
  'USING and WITH CHECK both bind user_id, so a seller cannot transfer their shop to another account.';

CREATE POLICY stores_delete_owner ON public.stores
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

REVOKE UPDATE ON public.stores FROM anon;
GRANT UPDATE (title, slug, description, phone, address, logo_url, cover_url, updated_at) ON public.stores TO authenticated;
REVOKE UPDATE (is_verified) ON public.stores FROM authenticated;
COMMENT ON COLUMN public.stores.is_verified IS 'Admin/service-role only; not in the authenticated column grant.';

-- 3. CATEGORIES --------------------------------------------------------------
CREATE POLICY categories_select_public ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY categories_admin_write ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. PRODUCTS ----------------------------------------------------------------
CREATE POLICY products_select_published_or_owner ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    OR store_id IN (SELECT public.my_store_ids())
    OR public.is_admin()
  );
COMMENT ON POLICY products_select_published_or_owner ON public.products IS
  'Drafts and pending items are visible only to the seller who owns the store and to admins.';

CREATE POLICY products_insert_owner ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT public.my_store_ids()) OR public.is_admin());
COMMENT ON POLICY products_insert_owner ON public.products IS
  'A seller can only create products inside a store they own.';

CREATE POLICY products_update_owner ON public.products
  FOR UPDATE TO authenticated
  USING (store_id IN (SELECT public.my_store_ids()) OR public.is_admin())
  WITH CHECK (store_id IN (SELECT public.my_store_ids()) OR public.is_admin());
COMMENT ON POLICY products_update_owner ON public.products IS
  'Both clauses bind store_id, so a seller cannot move a product into another vendor store.';

CREATE POLICY products_delete_owner ON public.products
  FOR DELETE TO authenticated
  USING (store_id IN (SELECT public.my_store_ids()) OR public.is_admin());

-- 5. PRODUCT IMAGES / VARIANTS ----------------------------------------------
CREATE POLICY product_images_select ON public.product_images
  FOR SELECT TO anon, authenticated
  USING (
    product_id IN (SELECT p.id FROM public.products p WHERE p.status = 'published')
    OR product_id IN (
      SELECT p2.id FROM public.products p2
       WHERE p2.store_id IN (SELECT public.my_store_ids()) OR public.is_admin())
  );

CREATE POLICY product_images_write_owner ON public.product_images
  FOR ALL TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
       WHERE p.store_id IN (SELECT public.my_store_ids()) OR public.is_admin()))
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM public.products p
       WHERE p.store_id IN (SELECT public.my_store_ids()) OR public.is_admin()));

CREATE POLICY product_variants_select ON public.product_variants
  FOR SELECT TO anon, authenticated
  USING (
    product_id IN (SELECT p.id FROM public.products p WHERE p.status = 'published')
    OR product_id IN (
      SELECT p2.id FROM public.products p2
       WHERE p2.store_id IN (SELECT public.my_store_ids()) OR public.is_admin()));

CREATE POLICY product_variants_write_owner ON public.product_variants
  FOR ALL TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
       WHERE p.store_id IN (SELECT public.my_store_ids()) OR public.is_admin()))
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM public.products p
       WHERE p.store_id IN (SELECT public.my_store_ids()) OR public.is_admin()));

-- 6. ADDRESSES / WISHLISTS ---------------------------------------------------
CREATE POLICY user_addresses_own ON public.user_addresses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
COMMENT ON POLICY user_addresses_own ON public.user_addresses IS
  'Full CRUD on own rows only; WITH CHECK stops saving an address onto someone else account.';

CREATE POLICY wishlists_own ON public.wishlists
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. CARTS -------------------------------------------------------------------
-- No guest rows. The carts.session_id column stays for a future signed-cookie
-- design but RLS refuses user_id IS NULL, so nothing can reach it anonymously.
CREATE POLICY carts_own ON public.carts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);
COMMENT ON POLICY carts_own ON public.carts IS
  'Replaces the 002 policy that granted every signed-in user access to all guest carts.';

CREATE POLICY cart_items_own_cart ON public.cart_items
  FOR ALL TO authenticated
  USING (cart_id IN (SELECT c.id FROM public.carts c WHERE c.user_id = auth.uid()))
  WITH CHECK (cart_id IN (SELECT c.id FROM public.carts c WHERE c.user_id = auth.uid()));

-- 8. COUPONS -----------------------------------------------------------------
CREATE POLICY coupons_select_active ON public.coupons
  FOR SELECT TO anon, authenticated
  USING (
    (is_active AND (expires_at IS NULL OR expires_at > NOW()))
    OR public.is_admin()
  );
COMMENT ON POLICY coupons_select_active ON public.coupons IS
  'Only live coupons are discoverable; expired or disabled codes are admin-visible. Validation is re-checked in place_order().';

CREATE POLICY coupons_admin_write ON public.coupons
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 9. ORDERS ------------------------------------------------------------------
CREATE POLICY orders_select_owner_or_store_or_admin ON public.orders
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR store_id IN (SELECT public.my_store_ids())
    OR public.is_admin()
  );
COMMENT ON POLICY orders_select_owner_or_store_or_admin ON public.orders IS
  'Buyer, the fulfilling seller, or an admin. No policy grants SELECT to anon, so guest orders are only readable through the place_order() response.';

-- Deliberately NO INSERT / UPDATE / DELETE policy for orders.
-- Writes go through place_order() and update_order_status(), both SECURITY DEFINER,
-- so ownership, totals and payment_status are decided server-side in one transaction.

-- 10. ORDER ITEMS ------------------------------------------------------------
CREATE POLICY order_items_select_via_order ON public.order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
       WHERE o.user_id = auth.uid()
          OR o.store_id IN (SELECT public.my_store_ids())
          OR public.is_admin()));

-- 11. REVIEWS ----------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_one_per_user
  ON public.product_reviews (product_id, user_id);

CREATE POLICY reviews_select_public ON public.product_reviews
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY reviews_insert_self ON public.product_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
COMMENT ON POLICY reviews_insert_self ON public.product_reviews IS
  'Author is always the caller. Purchase verification happens in submit_review(), not in the policy.';

CREATE POLICY reviews_update_own ON public.product_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_delete_own ON public.product_reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 12. BLOG / SETTINGS --------------------------------------------------------
CREATE POLICY blog_posts_select ON public.blog_posts
  FOR SELECT TO anon, authenticated
  USING (published OR public.is_admin());

CREATE POLICY blog_posts_admin_write ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY blog_categories_select ON public.blog_categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY blog_categories_admin_write ON public.blog_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY site_settings_select ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);
COMMENT ON POLICY site_settings_select ON public.site_settings IS
  'Storefront copy and contact details are public; no secrets are stored in this table.';

CREATE POLICY site_settings_admin_write ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 13. CONTACT MESSAGES -------------------------------------------------------
CREATE POLICY contact_messages_insert_public ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
COMMENT ON POLICY contact_messages_insert_public ON public.contact_messages IS
  'The public contact form posts here. Read access is admin-only, so a submitter cannot enumerate other messages.';

CREATE POLICY contact_messages_select_admin ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY contact_messages_update_admin ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY contact_messages_delete_admin ON public.contact_messages
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Trigger-maintained aggregates must not be writable through the API, or a seller
-- could forge their own rating / revenue on the shop page.
-- ---------------------------------------------------------------------------
REVOKE UPDATE (rating, reviews_count) ON public.products FROM anon, authenticated;
REVOKE INSERT (rating, reviews_count) ON public.products FROM anon, authenticated;
REVOKE UPDATE (products_count, sales_count, total_revenue, rating, reviews_count) ON public.stores FROM anon, authenticated;
REVOKE INSERT (products_count, sales_count, total_revenue, rating, reviews_count) ON public.stores FROM anon, authenticated;
REVOKE INSERT (user_id) ON public.user_addresses FROM anon;
REVOKE ALL ON public.user_addresses FROM anon;
REVOKE ALL ON public.carts FROM anon;
REVOKE ALL ON public.cart_items FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;
REVOKE ALL ON public.wishlists FROM anon;
REVOKE ALL ON public.product_reviews FROM anon;
REVOKE ALL ON public.profile_public FROM PUBLIC;

COMMENT ON TABLE public.orders IS 'Write path: place_order() RPC only (migration 007). No RLS INSERT/UPDATE policy exists by design.';
