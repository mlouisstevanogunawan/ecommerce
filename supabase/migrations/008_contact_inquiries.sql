-- Migration 008: Product inquiries need a home
--
-- The product page has an "Ask a Question" form and the contact page collects a
-- subject line, but contact_messages had no columns for either, so both were
-- being faked client-side. These additions are additive and idempotent; no
-- existing column or row is touched.
--
-- Requires migrations 001 (contact_messages, products) and 006 (RLS policies).
-- Safe to re-run.

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- subject is only used for display, so bound its length the same way the API does.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_messages_subject_length'
  ) THEN
    ALTER TABLE public.contact_messages
      ADD CONSTRAINT contact_messages_subject_length CHECK (subject IS NULL OR char_length(subject) <= 200);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS contact_messages_product_idx
  ON public.contact_messages (product_id);

CREATE INDEX IF NOT EXISTS contact_messages_created_idx
  ON public.contact_messages (created_at DESC);

COMMENT ON COLUMN public.contact_messages.subject IS
  'Optional subject from the public contact form.';
COMMENT ON COLUMN public.contact_messages.product_id IS
  'Set when the message is an "Ask a Question" inquiry about a specific listing. '
  'ON DELETE SET NULL keeps a deleted product from taking the support history with it.';

-- 006 grants INSERT WITH CHECK (true) to anon and authenticated and leaves the
-- table-wide column rights in place, so the two new nullable columns are
-- automatically writable — no policy or grant change is needed.
