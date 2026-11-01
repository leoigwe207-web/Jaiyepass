# JaiyePass V2 — Safe Supabase deployment steps

This package preserves the existing source while fixing an important flaw: checkout previously accepted published **demo** events. `src/lib/checkout.ts` now rejects `is_demo` and already-started events server-side. **This patch has not been run through a full npm build or E2E test.**

## Before you start
- Supabase project ref: `zaowgedkxfghcjocvlbz` (`jaiyepass`). Verify the project in the Dashboard before every write.
- The Supabase/Vercel integration has already supplied production `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not duplicate or expose the service key.
- All SQL migration filenames in this package were given 14-digit timestamp prefixes for the Supabase CLI. They replace `0001_` ... `0007_` in the previous ZIP. Do not mix both versions.
- `20261026090105_seed.sql` creates **8 clearly labelled published demo events**. The patched checkout rejects their purchases. Public listings still show them as examples, not real events.

## Windows PowerShell (inside JaiyePass-V2 folder)
```powershell
npx.cmd supabase --help
npx.cmd supabase login
npx.cmd supabase link --project-ref zaowgedkxfghcjocvlbz
npx.cmd supabase db push --dry-run
# Review migrations listed in the dry run, then apply:
npx.cmd supabase db push
npx.cmd supabase migration list
```
Supabase might prompt for a remote database password. Enter it in your terminal, never in chat. Do **not** run `supabase db reset` against a remote project.

## Verify
1. In Supabase SQL Editor, run the read-only `supabase/verify_readonly.sql` in this package.
2. Expect 25 `public` tables, all with RLS; sensitive four RPCs blocked for anon/authenticated and allowed for service_role; three security triggers; seven recorded migrations.
3. Run Supabase Security and Performance Advisors and fix high-severity findings.
4. Authenticate as separate attendee, host, scanner and admin test users; verify no cross-account access or role escalation.
5. Confirm the demo events cannot be checked out. Do not turn on live Paystack credentials.

## Vercel config
In TOPDON / jaiyepass / Settings / Environment Variables:
- Confirm (already integrated for production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Add `NEXT_PUBLIC_APP_URL=https://jaiyepass.vercel.app`.
- Generate `TICKET_TOKEN_PEPPER` *locally*: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and save as **server-only Sensitive** in Vercel. Never add NEXT_PUBLIC_ prefix to it, and don't share its value.
- If using real email: add `RESEND_API_KEY` and an approved `EMAIL_FROM` domain.
- If testing Paystack: use **test** keys and test webhook, not live keys.
- The Supabase integration was detected for **production only**. A preview deployment needs correctly scoped preview variables, preferably connected to a separate staging Supabase instance.
- Env changes only affect new deployments. Redeploy only after full checks.

## Tests (after npm dependencies are installed)
```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
node scripts/smoke-v2.cjs
```

## Known limitations before a real launch
- Rate limiting uses in-memory storage; replace it with shared storage for serverless production.
- QR scanner and Paystack refund/retry flows require browser and provider sandbox end-to-end testing.
- Hold expiry needs scheduled execution, monitoring, and reconciliation.
- Database migration application is **not** automatic and this package has **not** been deployed.
