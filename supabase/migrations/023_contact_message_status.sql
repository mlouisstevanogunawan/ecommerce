-- 023 — support inbox: status domain and the admin list query
--
-- Why: the contact form writes contact_messages (24 rows had never been read because
-- no admin screen existed yet), and `status` was free text with only a default of
-- 'unread'. The inbox UI filters on exactly 'unread' or 'read', so an unexpected
-- value would silently hide a message from the moderator. The domain is now the
-- database's, not the app's. The composite index serves the inbox's default query
-- (unread first, newest first) which otherwise sequential-scanned the table.

-- 1. Only the two states the application can set. All 24 existing rows are 'unread',
--    so the constraint validates cleanly.
ALTER TABLE public.contact_messages
  DROP CONSTRAINT IF EXISTS contact_messages_status_check;
ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_status_check
  CHECK (status IN ('unread', 'read'));

-- 2. The inbox orders by status then newest first.
CREATE INDEX IF NOT EXISTS contact_messages_inbox_idx
  ON public.contact_messages (status, created_at DESC);
