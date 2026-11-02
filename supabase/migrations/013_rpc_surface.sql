-- Migration 013: remove internal trigger helpers from the PostgREST RPC surface
-- Follows 012. Idempotent: safe to re-run.
--
-- The performance advisors flagged five functions as callable by signed-in users
-- via /rest/v1/rpc/<name>. They are internal plumbing, never called by the app
-- (grep the source: the client only calls my_cart_id, cart_*, checkout_rules,
-- coupon_discount, place_order, update_order_status, submit_review), so any role
-- that can sign in should not be able to invoke them directly.
--
-- The open question was whether revoking EXECUTE from `authenticated` breaks the
-- triggers, since PostgREST writes run as `authenticated`. It does not: Postgres
-- fires a trigger with the table owner's privileges, not the triggering role's.
-- Verified on this project by running
--   set role authenticated;  -- claims = the seller demo user
--   update public.products set title = title where id = '<a product of trendshop>';
-- and reading updated_at back: it equals now() to the microsecond, so
-- set_updated_at() and tg_product_store_stats() both executed for a role that
-- holds no EXECUTE on them. The 76-check end-to-end suite passes with these
-- revokes in place.
--
-- PUBLIC is revoked first in each statement's own right: without an explicit
-- grant, supabase_auth_admin, postgres and service_role would lose the rights
-- they currently inherit, so the grants below come first wherever needed.

-- set_updated_at / tg_*: keep postgres + service_role (migrations and seed run as
-- postgres; admin scripts may run as service_role), drop everything else.
GRANT EXECUTE ON FUNCTION public.set_updated_at()          TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.tg_product_review_stats() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.tg_product_store_stats()   TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.tg_order_store_stats()     TO postgres, service_role;

REVOKE EXECUTE ON FUNCTION public.set_updated_at()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_product_review_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_product_store_stats()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_order_store_stats()     FROM PUBLIC, anon, authenticated;

-- is_seller() is referenced by zero policies and zero functions and is not called
-- from the app; role checks in the app read profiles.role through requireRole().
-- It stays defined (a future policy can use it) but is no longer public API.
GRANT EXECUTE ON FUNCTION public.is_seller() TO postgres, service_role;
REVOKE EXECUTE ON FUNCTION public.is_seller() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.is_seller() IS
  'Unused since 013: EXECUTE revoked from anon/authenticated. Kept for policy authoring; requireRole() is the app-side authority.';
