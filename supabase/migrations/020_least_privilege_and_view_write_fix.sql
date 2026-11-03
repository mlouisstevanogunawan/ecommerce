-- Migration 020: close the view write-bypass and align table grants with the RLS policies
--
-- Two independent findings from the Phase 2 audit, both about privileges that are wider
-- than the policies guarding them:
--
-- 1. profile_public (created in 006) is a plain view owned by `postgres`, so it runs with
--    the owner's rights and SKIPS the row-level security on `profiles`. Migration 006 line
--    407 does `REVOKE ALL ON public.profile_public FROM PUBLIC`, but that only removes the
--    rights inherited through the PUBLIC pseudo-role — the explicit `GRANT SELECT ... TO anon,
--    authenticated` earlier in the file plus Supabase's default privileges left anon holding
--    INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER on the view. Because the view is
--    a single bare table it is auto-updatable, so `DELETE FROM profile_public` executed by `anon`
--    deletes every row in `profiles`. Verified live in a rolled-back transaction, and reported
--    by the Supabase linter as `security_definer_view` (level ERROR).
--    019 closed the equivalent TRUNCATE hole on tables but filtered relkind IN ('r','p'), which
--    excludes views — this migration covers the view and the remaining privilege classes.
--
-- 2. Several tables still grant DML that has no matching policy: `anon` could attempt writes on
--    fourteen catalogue tables and could even SELECT `payments`; `authenticated` could write
--    `orders`, `order_items` and `payments` directly even though every write to those tables goes
--    through the SECURITY DEFINER RPCs (place_order / update_order_status). RLS rejects those
--    attempts today, so this is defence-in-depth rather than an active exploit, but leaving them
--    granted is exactly how finding 1 survived.
--
-- Also here: pin search_path on product_brands() (the one SECURITY-invokable function 006-era
-- tooling missed; the other 21 already carry `search_path=public, pg_temp`), and add the missing
-- covering index on store_follows.user_id flagged by the performance advisor.
--
-- Deliberately NOT changed: anon keeps EXECUTE on is_admin() and my_store_ids(). Those functions
-- appear in the USING clause of policies that apply to anon (products_select_published_or_owner,
-- banners_select_active, coupons_select_active); Postgres evaluates a policy expression as the
-- querying role, so revoking EXECUTE would break every public catalogue query with
-- "permission denied for function". Both return empty/false without an auth.uid(), so exposing
-- them leaks nothing.
--
-- Idempotent: REVOKE/GRANT are safe to repeat. Nothing here drops or alters a table, a column, or
-- a row, so existing data is untouched.

-- 1. profile_public: read-only for API roles. The view stays (src/lib/supabase/data.ts:217 reads
--    review author names through it) but no longer forwards writes to `profiles`.
REVOKE ALL ON public.profile_public FROM anon, authenticated, service_role, PUBLIC;
GRANT SELECT ON public.profile_public TO anon, authenticated, service_role;

COMMENT ON VIEW public.profile_public IS
  'Read-only public projection of profiles (id, full_name, avatar_url, created_at). Runs as the '
  'view owner, so it intentionally exposes fewer columns than profiles and accepts no writes; '
  'grants on it are SELECT-only for anon/authenticated/service_role (migration 020).';

-- 2. anon: the storefront is a read-only client. Only the two public write endpoints survive —
--    the contact form and the newsletter box, which have INSERT policies for anon by design.
REVOKE ALL ON TABLE public.banners, public.blog_categories, public.blog_posts, public.categories,
  public.contact_messages, public.coupons, public.newsletter_subscribers, public.order_items,
  public.orders, public.payments, public.product_images, public.product_reviews,
  public.product_variants, public.products, public.profiles, public.site_settings,
  public.store_follows, public.stores, public.user_addresses, public.carts, public.cart_items,
  public.wishlists
  FROM anon;

GRANT SELECT ON TABLE public.banners, public.blog_categories, public.blog_posts, public.categories,
  public.coupons, public.product_images, public.product_reviews, public.product_variants,
  public.products, public.site_settings, public.stores
  TO anon;

GRANT INSERT ON TABLE public.contact_messages, public.newsletter_subscribers TO anon;

-- 3. authenticated: drop the DML that has no policy behind it.
--    Order/payment rows are written only inside place_order() and update_order_status(), both
--    SECURITY DEFINER, so the signed-in role needs SELECT and nothing more.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.orders, public.order_items, public.payments
  FROM authenticated;
REVOKE DELETE ON TABLE public.profiles FROM authenticated;
REVOKE INSERT, DELETE ON TABLE public.site_settings FROM authenticated;

--    profiles keeps a matching UPDATE policy (profiles_update_own_or_admin) but had no UPDATE
--    grant, so the policy could never be reached. Granting it is what lets an account page edit
--    its own name/phone/avatar; role changes stay admin-only through the column grants in 006.
GRANT UPDATE ON TABLE public.profiles TO authenticated;

COMMENT ON TABLE public.profiles IS
  'One row per auth user. The role column is not writable by the authenticated role (006 column '
  'grants); only the service-role admin path used by updateUserRole() can change it.';

-- 4. product_brands(): pin the search path like every other function in the schema.
ALTER FUNCTION public.product_brands() SET search_path = public, pg_temp;

-- 5. store_follows.user_id: covering index for the FK (performance advisor unindexed_foreign_keys).
CREATE INDEX IF NOT EXISTS store_follows_user_id_idx ON public.store_follows (user_id);
