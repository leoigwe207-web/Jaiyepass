JaiyePass production migration hotfix — October 27, 2026

Contains only supabase/migrations/20261027000100_production_hardening.sql.

Reason: public.events has a BEFORE UPDATE trigger events_protect_publication
which rejects status changes to 'hidden' when a migration runs as postgres.
The failed migration was not applied as of the inspection; 8 demo events remained unmodified.
The fix disables that trigger only during the targeted demo-event update,
then re-enables it before COMMIT. On failure, the transaction rolls back.

BEFORE RUNNING db push: complete schema and data backups. The previous
Supabase CLI dump failed because Docker/Podman was not available.

PowerShell (from C:\Users\David\Documents\JaiyePass):
  Expand-Archive "$HOME\Downloads\JaiyePass-Migration-Trigger-Fix.zip" -DestinationPath . -Force

After successfully backing up and checking the migration list:
  npx.cmd supabase db push --linked

Afterward verify Supabase reports the new migration applied, that demo
records are hidden, and that events_protect_publication is still enabled.
DO NOT share Supabase tokens or database connection passwords in chat.
