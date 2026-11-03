-- Migration 018: banners.category_id
-- The homepage renders one showcase section per category, so a banner placed in
-- 'category_showcase' has to say which category it belongs to. Without this
-- column the section could only pick a banner by index, which shows the wrong
-- marketing copy as soon as an admin reorders anything.
-- Idempotent: safe to re-run.

ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_banners_category ON public.banners (category_id);

-- A category banner without a category would be unreachable, and a non-category
-- banner carrying one is a data mistake.
ALTER TABLE public.banners DROP CONSTRAINT IF EXISTS banners_category_id_shape;
ALTER TABLE public.banners
    ADD CONSTRAINT banners_category_id_shape
    CHECK (
        (placement = 'category_showcase') = (category_id IS NOT NULL)
    ) NOT VALID;

ALTER TABLE public.banners VALIDATE CONSTRAINT banners_category_id_shape;
