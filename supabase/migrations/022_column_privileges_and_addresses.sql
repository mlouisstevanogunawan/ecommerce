-- 022 — column-level profile writes and the address-book invariants
--
-- Why: `authenticated` held table-wide UPDATE on public.profiles, so a request sent
-- straight to the PostgREST endpoint with any signed-in user's JWT could change that
-- user's own `role` (or `email`) even though RLS allows the row. Column privileges
-- close that at the database instead of relying on the API route to pick columns.
-- The address book needs the same treatment: "one default per user" was only a
-- convention in the app, and the first saved address was not marked default at all.

-- 1. Only these three profile columns may be written by a signed-in user.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, avatar_url) ON TABLE public.profiles TO authenticated;

-- 2. One default address per user, enforced by the database.
CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_one_default_idx
  ON public.user_addresses (user_id)
  WHERE is_default;

-- 3. The first address a user saves becomes the default.
CREATE OR REPLACE FUNCTION public.default_first_address()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_addresses a WHERE a.user_id = NEW.user_id) THEN
    NEW.is_default := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_addresses_default_first ON public.user_addresses;
CREATE TRIGGER trg_user_addresses_default_first
  BEFORE INSERT ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.default_first_address();

-- 4. Deleting the default promotes the newest remaining address, so checkout always has one.
CREATE OR REPLACE FUNCTION public.promote_next_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_id uuid;
BEGIN
  IF OLD.is_default
     AND NOT EXISTS (SELECT 1 FROM public.user_addresses a WHERE a.user_id = OLD.user_id AND a.is_default)
  THEN
    SELECT a.id INTO next_id
      FROM public.user_addresses a
     WHERE a.user_id = OLD.user_id
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT 1;

    IF next_id IS NOT NULL THEN
      UPDATE public.user_addresses SET is_default = TRUE WHERE id = next_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_addresses_promote_default ON public.user_addresses;
CREATE TRIGGER trg_user_addresses_promote_default
  AFTER DELETE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.promote_next_default_address();

-- 5. Swapping the default needs two writes, so it is one statement for the client.
--    SECURITY INVOKER on purpose: the UPDATEs run as the caller and RLS keeps them
--    inside the caller's own rows.
CREATE OR REPLACE FUNCTION public.set_default_address(p_address_id uuid)
RETURNS SETOF public.user_addresses
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.user_addresses
     SET is_default = FALSE
   WHERE user_id = (SELECT auth.uid())
     AND is_default
     AND id <> p_address_id;

  UPDATE public.user_addresses
     SET is_default = TRUE
   WHERE id = p_address_id
     AND user_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'address % not found', p_address_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY SELECT * FROM public.user_addresses WHERE id = p_address_id;
END;
$$;

REVOKE ALL ON FUNCTION public.default_first_address() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.promote_next_default_address() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_default_address(uuid) FROM PUBLIC, anon;
-- Trigger bodies run with the statement's role, so the writer needs EXECUTE on them.
GRANT EXECUTE ON FUNCTION public.default_first_address() TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_next_default_address() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_address(uuid) TO authenticated;

COMMENT ON FUNCTION public.set_default_address(uuid) IS
  'Marks one of the caller''s own addresses as default; RLS confines both updates to their rows.';
COMMENT ON COLUMN public.profiles.role IS
  'Not writable by the owner: authenticated holds UPDATE only on full_name, phone, avatar_url.';
