-- Migration 009: Signup can never mint an administrator
--
-- The register form sends { role: 'seller' | 'customer' } in signup user metadata so a
-- buyer can become a vendor without waiting for staff. That same field is attacker
-- controlled: supabase.auth.signUp() forwards arbitrary options, so a hand-built request
-- with role='admin' would have been inserted as an administrator by handle_new_user().
--
-- profiles.role is still changed only server-side (the admin console writes it with the
-- service role), so 'seller' remains the highest role the signup path can grant.
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url',
    CASE NEW.raw_user_meta_data ->> 'role'
      WHEN 'seller' THEN 'seller'::user_role
      ELSE 'customer'::user_role
    END
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates the profiles row for a new auth.users row. Signup metadata can only produce customer or seller; admin is granted server-side.';
