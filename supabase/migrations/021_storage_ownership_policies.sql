-- Migration 021: real ownership rules for Supabase Storage
--
-- The three INSERT policies left by 003 were named after the roles they claimed to serve
-- ("Admins can upload to blog", "Sellers can upload product images", "Users can upload avatar")
-- but their WITH CHECK was only `auth.uid() IS NOT NULL`. So any signed-in customer could write
-- into the blog bucket, and any signed-in account could write anywhere in products/covers/
-- digital_files, including another person's folder — `avatars/<someone-else-uuid>/x.png` is then
-- served as that person's avatar. There were also no UPDATE or DELETE policies at all, so
-- replacing or removing an uploaded image could never work, which is what Phase 8 asks for.
--
-- This replaces them with the two conditions the names promised:
--   * the object must live under the uploader's own folder (`<uid>/...`), and
--   * the uploader must actually hold the role the bucket is for, using is_seller()/is_admin(),
--     which read profiles the same way the API routes do.
-- Bucket-level file-size and MIME limits already live on storage.buckets (products 10MB
-- jpeg/png/webp/gif, avatars 5MB, covers 10MB, blog 10MB), so they are not duplicated here.
--
-- digital_files is left with no policy on purpose: nothing in the application reads or writes it,
-- and giving it access would create a capability the UI does not have.
--
-- One privilege has to come back for this to work: 013 removed EXECUTE on is_seller() from
-- `authenticated` to shrink the callable RPC surface, but a policy expression is evaluated as the
-- querying role, so a policy that calls is_seller() would fail every upload with
-- "permission denied for function is_seller". Restoring EXECUTE leaks nothing — the function only
-- reports whether the caller's own profile row carries the seller/admin role. is_admin() already
-- had EXECUTE for both roles and is used the same way.
--
-- Idempotent: DROP POLICY IF EXISTS then CREATE POLICY, safe to re-run.

GRANT EXECUTE ON FUNCTION public.is_seller() TO authenticated;

-- 1. Drop the role-blind policies from 003.
DROP POLICY IF EXISTS "Admins can upload to blog" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatar" ON storage.objects;

-- 2. Product photos: sellers (is_seller() also covers admins) may only touch their own folder.
CREATE POLICY "Seller product image upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'products'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_seller()
  );

CREATE POLICY "Seller product image replace" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'products'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_seller()
  )
  WITH CHECK (
    bucket_id = 'products'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_seller()
  );

CREATE POLICY "Seller product image delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'products'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_seller()
  );

-- 3. Store logo/cover and homepage banner art: same seller-or-admin rule, own folder only.
CREATE POLICY "Seller cover upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_seller()
  );

CREATE POLICY "Seller cover replace" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'covers'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_seller()
  )
  WITH CHECK (
    bucket_id = 'covers'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_seller()
  );

CREATE POLICY "Seller cover delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'covers'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_seller()
  );

-- 4. Avatars belong to the account itself, so any signed-in user may manage their own folder.
CREATE POLICY "Avatar upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );

CREATE POLICY "Avatar replace" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );

CREATE POLICY "Avatar delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );

-- 5. Blog artwork is admin-only, still inside the writer's own folder.
CREATE POLICY "Admin blog image upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_admin()
  );

CREATE POLICY "Admin blog image replace" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'blog'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'blog'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_admin()
  );

CREATE POLICY "Admin blog image delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'blog'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND public.is_admin()
  );

COMMENT ON POLICY "Seller product image upload" ON storage.objects IS
  'Own-folder writes gated by is_seller(); bucket MIME/size limits do the rest (migration 021).';
