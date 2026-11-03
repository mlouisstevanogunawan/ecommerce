-- 019: strip the non-DML privileges Supabase's legacy default grants left on every
-- public table for anon/authenticated.
--
-- Why this is a security fix and not cosmetic: RLS only gates SELECT/INSERT/UPDATE/
-- DELETE. TRUNCATE is not checked against any policy, so the inherited
-- "...Dxtm" (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) grant on products, orders,
-- profiles, stores, ... let any role that holds it wipe a table while bypassing RLS
-- entirely, and REFERENCES lets a role declare foreign keys against it.
--
-- The app never uses these privileges (it talks PostgREST, which issues DML only),
-- so removing them cannot break a feature. Idempotent: revoking a privilege that is
-- already absent is a no-op.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.oid::regclass AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')          -- ordinary + partitioned tables
      AND c.relname NOT IN ('spatial_ref_sys')  -- extension-owned
  LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE %s FROM anon, authenticated', t.name);
  END LOOP;
END $$;

-- Service-to-service joins and the postgres-owned objects keep their rights; only
-- the two web-facing roles are narrowed. Anything the API genuinely needs to write
-- (carts, orders via SECURITY DEFINER functions, reviews, contact messages, ...) is
-- still covered by the INSERT/UPDATE/DELETE grants plus the policies in 002/006.
