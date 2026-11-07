-- STAGED: Guest checkout (requires a separate Supabase staging database).
-- DO NOT APPLY TO PRODUCTION until full payment/QR/email E2E passes.
-- Non-destructive: existing authenticated order rows and RLS policies preserved.
BEGIN;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_token_hash text;
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN user_id DROP NOT NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.orders'::regclass AND conname='orders_guest_owner_xor') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_guest_owner_xor CHECK (
      (user_id IS NOT NULL AND guest_token_hash IS NULL AND guest_email IS NULL AND guest_name IS NULL)
      OR
      (user_id IS NULL AND guest_token_hash IS NOT NULL AND guest_email IS NOT NULL AND guest_name IS NOT NULL)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.orders'::regclass AND conname='orders_guest_details_format') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_guest_details_format CHECK (
      user_id IS NOT NULL OR (
        char_length(guest_name) BETWEEN 2 AND 120
        AND char_length(guest_email) BETWEEN 5 AND 254
        AND guest_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        AND guest_token_hash ~ '^[a-f0-9]{64}$'
      )
    );
  END IF;
END;
$migration$;

-- Existing RLS policies remain untouched; guest rows are inaccessible to
-- anon/authenticated roles because auth.uid() is NULL for these records.
-- The Next.js API must check a random HttpOnly cookie against SHA256 hash.
-- The service_role remains server-only; never expose it to the browser.
COMMIT;
