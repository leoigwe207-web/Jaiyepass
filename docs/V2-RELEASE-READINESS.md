# JaiyePass V2 — release notes and verification checklist

## What this package is
This is the user's original JaiyePass Next.js app with focused V2 upgrades. It **does not** represent a deployed, completed, production-tested payment platform. It does not modify the original archive or the Supabase production database.

## Completed in source
- Nationwide defaults in hero search and browse (rather than Lagos only).
- Nigeria-only city query and city navigation; starter nationwide cities migration.
- Improved public layout, responsive CTAs, brand consistency and SEO metadata.
- Sample preview events across Nigerian cities when Supabase is unconfigured. Every example is labelled demo and **cannot be purchased**. Eight matching local SVG posters.
- Removed database setup/credential instructions from public home and event-error UI.
- Corrected event pricing, ticket sales window and availability classification (a DB hold can still make last seats unavailable at checkout).
- Availability filter now influences public browse results; keyword search includes event description and venue matches.
- Hardened database SQL migration: privileged RPC execution, profile role elevation on insert/update, and event publish-status escalation. Existing baseline 0001–0005 migrations are preserved except a demo-seed image format and Nigeria location correction.
- Hardened Paystack webhook duplicate handling: failed/unprocessed webhook events remain retryable; no successful acknowledgement when ticket finalization fails.
- Added repeatable dependency-light smoke tests.

## Required before live release
1. **Set up source control**: push reviewed source to the correct JaiyePass GitHub repository. Do not push `.env*` secrets, `.vercel`, local logs, or build artifacts.
2. **Review migrations** in a throwaway/local database before applying anything. Apply `20261026090101_setup.sql` through `20261026090107_nationwide_cities.sql` in order. `20261026090106_harden_rpc.sql` restricts sensitive RPCs; do not omit it. No migration has been applied to production by this upgrade package.
3. **Validate Supabase privileges after migrating**: ensure no authenticated caller can execute `finalize_paid_order`, `claim_check_in` or `create_inventory_hold` directly. Verify attendee, host, scanner and admin isolation as different signed-in users.
4. **Configure secrets via hosting UI**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TICKET_TOKEN_PEPPER`, and `NEXT_PUBLIC_APP_URL`. Keep service role/pepper out of client builds, repo and logs. The first two may be public; the others may not.
5. **No real Paystack transactions yet**: configure **test keys only** and webhook endpoint in Paystack first; test signature failures, replays, provider outages, partial failures, amount/currency mismatch, refund reconciliation and ticket issuance. Switch live keys only after explicit approval.
6. **Email**: configure an approved transactional email domain and RESEND_API_KEY, then verify delivery to real test accounts.
7. **Rate limiting**: `src/lib/rate-limit.ts` still uses per-process memory, unsuitable as a global production boundary across Vercel serverless instances. Replace with centralized rate limiting (shared Redis/database) before high-traffic production.
8. **Build/test**: execute `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `node scripts/smoke-v2.cjs`, and perform real browser/mobile checkout, QR scans and access isolation tests. Do not deploy until all gates pass.
9. **Operational readiness**: configure ticket reservation expiry job, payout processes, support/refund contact points, event moderation, privacy/terms review, error monitoring and backups.
10. **Vercel integration**: preview deploy first; test; production publish only after authorization. Production domain in `NEXT_PUBLIC_APP_URL` must match the destination.

## Current verification performed during upgrade
- 127 TypeScript/TSX files checked using TypeScript transpilation for syntax errors.
- 16 smoke checks passed for preview data, demo art, event pricing / sales windows, and security-migration presence.
- SVG poster files checked for existence.
- Not completed: full app `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, browser E2E, Paystack sandbox E2E, live database RLS tests. npm package installation was blocked by unavailable registry DNS/network in this environment.

## Security warnings
- Never grant public/authenticated EXECUTE on privileged transaction or scanner RPCs.
- Never create a user profile with `role=admin` using public signup.
- Avoid assuming database-sourced event images are trustworthy; restrict host uploads and apply acceptable image domains/type checks.
- Unconfigured public previews deliberately cannot create tickets, orders, or checkout payments.
- The demo seed is illustrative and should be removed/replaced with real organizer events when launching publicly; avoid false venues or claims.
