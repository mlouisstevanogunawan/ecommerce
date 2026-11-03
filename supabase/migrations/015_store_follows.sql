-- Migration 015: store follows
-- The seller page "Follow" button only flipped local React state and the
-- follower count was a hardcoded 148, so the number shown was fabricated.
-- This table makes both real: the count is derived from stored rows and the
-- button writes through /api/follow.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.store_follows (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF EXISTS store_follows_store_user_key ON public.store_follows (store_id, user_id);
CREATE INDEX IF NOT EXISTS idx_store_follows_store ON public.store_follows (store_id);

ALTER TABLE public.store_follows ENABLE ROW LEVEL SECURITY;

-- A follow is personal data: a user reads and writes only their own rows. The
-- public number is exposed through the aggregate function below, never by
-- letting everyone read the table.
DROP POLICY IF EXISTS store_follows_own ON public.store_follows;
CREATE POLICY store_follows_own ON public.store_follows
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS store_follows_insert_own ON public.store_follows;
CREATE POLICY store_follows_insert_own ON public.store_follows
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS store_follows_delete_own ON public.store_follows;
CREATE POLICY store_follows_delete_own ON public.store_follows
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.store_follows FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.store_follows TO authenticated;

-- Aggregates have to be readable by shoppers who are not following anyone, and
-- a plain SELECT policy cannot express "count only". SECURITY DEFINER runs as
-- the table owner, which bypasses RLS for this one read, and it returns only a
-- number and a boolean for the caller's own row.
CREATE OR REPLACE FUNCTION public.store_follower_count(p_store_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COUNT(*)::int FROM public.store_follows WHERE store_id = p_store_id;
$$;

CREATE OR REPLACE FUNCTION public.is_following_store(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.store_follows
        WHERE store_id = p_store_id AND user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.store_follower_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_follower_count(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_following_store(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_following_store(uuid) TO anon, authenticated, service_role;
