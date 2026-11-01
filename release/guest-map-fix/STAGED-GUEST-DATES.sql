-- SAFE SCHEMA EXTENSIONS (STAGED: do not apply until guest checkout tested in staging)
-- Allow ticket checkout without creating a Supabase Auth account.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_token_hash text;
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN user_id DROP NOT NULL;
-- An organizer may provide only a start time; never invent an end time.
ALTER TABLE public.events ALTER COLUMN ends_at DROP NOT NULL;
-- Existing event_dates_valid CHECK still rejects an end earlier than the start.
ALTER TABLE public.orders
  ADD CONSTRAINT orders_guest_identity_required
  CHECK (user_id IS NOT NULL OR (guest_name IS NOT NULL AND guest_email IS NOT NULL AND guest_token_hash IS NOT NULL));
ALTER TABLE public.orders
  ADD CONSTRAINT orders_guest_token_sha256
  CHECK (guest_token_hash IS NULL OR guest_token_hash ~ '^[a-f0-9]{64}$');
-- The guest identity may not be assigned a real user ID at the same time.
ALTER TABLE public.orders
  ADD CONSTRAINT orders_guest_identity_exclusive
  CHECK (user_id IS NULL OR guest_token_hash IS NULL);
-- No publicly accessible guest order policies; server API authorizes using HttpOnly cookie + SHA256.
-- Guest information stays inside the protected orders table.
