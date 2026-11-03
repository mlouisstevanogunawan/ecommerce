-- Migration 017: distinct brand list for the catalogue filter
-- The sidebar offered six invented brand names, so ?brand= never matched a
-- product. The real values live in products.details -> 'Brand'; this returns the
-- distinct set that published products actually use.
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.product_brands()
RETURNS TABLE(brand text)
LANGUAGE sql
STABLE
AS $$
    SELECT DISTINCT trim(p.details ->> 'Brand') AS brand
    FROM public.products p
    WHERE p.status = 'published'
      AND p.details ->> 'Brand' IS NOT NULL
      AND trim(p.details ->> 'Brand') <> ''
    ORDER BY brand;
$$;

REVOKE ALL ON FUNCTION public.product_brands() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.product_brands() TO anon, authenticated, service_role;
