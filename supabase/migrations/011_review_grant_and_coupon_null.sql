-- Migration 011: regressions found by the end-to-end harness
--
-- 1. product_reviews was readable by anonymous visitors through its RLS policy, but
--    migration 006 also ran REVOKE ALL ON public.product_reviews FROM anon, and a
--    missing table grant fails before any policy is considered. Every anonymous product
--    page therefore died with "permission denied for table product_reviews".
-- 2. coupon_discount() is a scalar SELECT over public.coupons. When no row matches
--    (no code, wrong code, expired, below the minimum) the set is empty and the whole
--    expression yields NULL — the COALESCE inside the select list never runs. A checkout
--    without a coupon then tried to insert NULL into orders.discount, which is NOT NULL,
--    so coupon-less orders could not be placed at all.
--
-- Safe to re-run.

GRANT SELECT ON public.product_reviews TO anon;

CREATE OR REPLACE FUNCTION public.coupon_discount(p_code TEXT, p_subtotal NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- The COALESCE has to wrap the subquery: an empty result set is NULL, and the
  -- expression inside the select list is never evaluated when there is no row.
  SELECT COALESCE((
    SELECT CASE
             WHEN c.discount_percent IS NOT NULL
               THEN round(p_subtotal * c.discount_percent / 100, 2)
             ELSE round(LEAST(c.discount_amount, p_subtotal), 2)
           END
      FROM public.coupons c
     WHERE c.is_active
       AND p_code IS NOT NULL
       AND upper(btrim(c.code)) = upper(btrim(p_code))
       AND (c.expires_at IS NULL OR c.expires_at > NOW())
       AND p_subtotal >= COALESCE(c.min_order_amount, 0)
     LIMIT 1), 0);
$$;

COMMENT ON FUNCTION public.coupon_discount(TEXT, NUMERIC) IS
  'Discount a coupon code is worth on this subtotal; 0 for unknown, expired, disabled or below-minimum codes.';
