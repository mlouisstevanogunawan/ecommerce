-- Migration 014: homepage banners
-- The hero carousel, the two/three-column promo strips and the category
-- showcase headers were hardcoded Unsplash marketing slides in the components.
-- They are content, so they move to the database and are entered through
-- /admin/banners. Nothing here seeds marketing copy: an empty table simply
-- means those sections render nothing (or the category's own real data).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.banners (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    placement       text NOT NULL CHECK (placement IN ('hero', 'promo_two', 'promo_three', 'category_showcase')),
    title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
    subtitle        text CHECK (subtitle IS NULL OR char_length(subtitle) <= 240),
    button_text     text CHECK (button_text IS NULL OR char_length(button_text) <= 40),
    link_url        text NOT NULL CHECK (char_length(link_url) BETWEEN 1 AND 500),
    image_url       text CHECK (image_url IS NULL OR image_url ~ '^https?://'),
    background_color text CHECK (background_color IS NULL OR background_color ~ '^#[0-9a-fA-F]{6}$'),
    sort_order      integer NOT NULL DEFAULT 0,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- A banner link is rendered inside an <a>/Link href, so script URLs must never
-- reach the table.
ALTER TABLE public.banners DROP CONSTRAINT IF EXISTS banners_link_url_not_script;
ALTER TABLE public.banners
    ADD CONSTRAINT banners_link_url_not_script
    CHECK (link_url !~* '^\s*(javascript|data|vbscript):');

CREATE INDEX IF NOT EXISTS idx_banners_placement_active
    ON public.banners (placement, is_active, sort_order);

DROP TRIGGER IF EXISTS trg_banners_updated_at ON public.banners;
CREATE TRIGGER trg_banners_updated_at
    BEFORE UPDATE ON public.banners
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Shoppers see active banners; an admin also sees the drafts so the edit
-- screen can list everything.
DROP POLICY IF EXISTS banners_select_active ON public.banners;
CREATE POLICY banners_select_active ON public.banners
    FOR SELECT TO anon, authenticated
    USING (is_active OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS banners_insert_admin ON public.banners;
CREATE POLICY banners_insert_admin ON public.banners
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS banners_update_admin ON public.banners;
CREATE POLICY banners_update_admin ON public.banners
    FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS banners_delete_admin ON public.banners;
CREATE POLICY banners_delete_admin ON public.banners
    FOR DELETE TO authenticated
    USING ((SELECT public.is_admin()));

-- Supabase's default privileges hand anon and authenticated every write on a
-- new table. The storefront only ever needs to read banners, so the grants are
-- narrowed here and the admin writes go through the service-role-free policy
-- above (an admin is an authenticated user).
REVOKE ALL ON public.banners FROM anon, authenticated;
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;
