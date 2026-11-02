-- Migration 010: Variant name uniqueness
--
-- A product's option list is keyed by name (S / M / L, Red / Blue). Without a unique
-- constraint the seller form could append a second "M" row, and both seed.sql and
-- any import need ON CONFLICT to stay idempotent.
--
-- Safe to re-run. On a database that already contains two variants with the same name
-- for one product, index creation fails and the duplicates must be merged first.

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_one_name_per_product
  ON public.product_variants (product_id, name);

COMMENT ON INDEX public.product_variants_one_name_per_product IS
  'One option row per name per product; used as the idempotency key by seed.sql.';
