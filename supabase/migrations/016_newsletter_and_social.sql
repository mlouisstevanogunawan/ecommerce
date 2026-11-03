-- Migration 016: newsletter subscribers + social links in site_settings
-- The footer "Subscribe to Newsletter" only flipped local state and never saved
-- an address, and its social icons pointed at bare domains (facebook.com etc.)
-- that belong to nobody. Both become real: subscribers are stored, and the
-- links come from the single site_settings row an admin edits.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email        text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Stored lowercased and trimmed by the API, so a repeat signup is a no-op
-- instead of a duplicate row.
CREATE UNIQUE INDEX IF EXISTS newsletter_subscribers_email_key ON public.newsletter_subscribers (lower(email));

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone may join the list; nobody but an admin may read it, because the table
-- is a list of personal email addresses.
DROP POLICY IF EXISTS newsletter_subscribers_insert_any ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_insert_any ON public.newsletter_subscribers
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS newsletter_subscribers_select_admin ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_select_admin ON public.newsletter_subscribers
    FOR SELECT TO authenticated
    USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS newsletter_subscribers_delete_admin ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_delete_admin ON public.newsletter_subscribers
    FOR DELETE TO authenticated
    USING ((SELECT public.is_admin()));

REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT SELECT, DELETE ON public.newsletter_subscribers TO authenticated;

-- Social profiles are configuration the owner must supply; NULL means "no link",
-- which the footer renders as a non-link instead of inventing a destination.
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS facebook_url  text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS twitter_url   text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS youtube_url   text;

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_facebook_url_http;
ALTER TABLE public.site_settings
    ADD CONSTRAINT site_settings_facebook_url_http
    CHECK (facebook_url IS NULL OR facebook_url ~ '^https?://') NOT VALID;

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_instagram_url_http;
ALTER TABLE public.site_settings
    ADD CONSTRAINT site_settings_instagram_url_http
    CHECK (instagram_url IS NULL OR instagram_url ~ '^https?://') NOT VALID;

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_twitter_url_http;
ALTER TABLE public.site_settings
    ADD CONSTRAINT site_settings_twitter_url_http
    CHECK (twitter_url IS NULL OR twitter_url ~ '^https?://') NOT VALID;

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_youtube_url_http;
ALTER TABLE public.site_settings
    ADD CONSTRAINT site_settings_youtube_url_http
    CHECK (youtube_url IS NULL OR youtube_url ~ '^https?://') NOT VALID;

-- The columns are brand new and therefore all NULL, so validation cannot fail
-- on existing rows and the table is never left unlocked.
ALTER TABLE public.site_settings VALIDATE CONSTRAINT site_settings_facebook_url_http;
ALTER TABLE public.site_settings VALIDATE CONSTRAINT site_settings_instagram_url_http;
ALTER TABLE public.site_settings VALIDATE CONSTRAINT site_settings_twitter_url_http;
ALTER TABLE public.site_settings VALIDATE CONSTRAINT site_settings_youtube_url_http;
