-- Staging-tested: public organizers are verified on setup; admins can pause/reject.
ALTER TYPE public.org_verification ADD VALUE IF NOT EXISTS 'paused';
ALTER TABLE public.organizations ALTER COLUMN verification SET DEFAULT 'verified'::public.org_verification;
