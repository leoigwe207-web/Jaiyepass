# JaiyePass V2 — production rebuild (2026-10-27)

## What this patch changes

- Removes demo sign-in, fake account flows, sample homepage/search/event fallbacks, simulated scanner responses and `/api/dev/complete-order`.
- Filters legacy `is_demo` events from public discovery and hides seeded demo rows through an explicitly reviewed SQL migration. No real order records are deleted.
- Preserves real Supabase authentication and host event creation/editing. Creates real admin metrics, preserves moderation/organizer/payout/report/audit screens, adds a ticket-email delivery monitor and retry action.
- Adds authenticated event-image uploads to existing host editing pages, rejects SVG/GIF/oversized files, decodes accepted JPG/PNG/WebP, limits pixels and re-encodes ONLY `image/webp` with metadata removed. The storage bucket permits WebP only and server-only writes.
- Adds separate PNG QR attachments for each ticket after a paid order is finalized by verified Paystack transaction or successful free-order issuance. Implements an atomic database send claim to avoid duplicate concurrent sends. Failed send attempts are visible to admins and can be retried.
- Tightens `profiles` INSERT/UPDATE grants, hardens role-change trigger, records email delivery attempts, fixes function search_path warnings.

## IMPORTANT: What is NOT complete automatically

**No production deployment, database mutation, sending domain verification or live Paystack payment has been performed by this patch.** These require your infrastructure and live-flow QA. Prior installation on your computer showed 103/103 tests passed, but those tests PRE-DATE the changes in this patch.

## 1. Install onto your EXISTING local JaiyePass project

Do NOT replace `package.json`, `package-lock.json`, `.env.local`, `.vercel`, or your Supabase credentials. This ZIP is an overlay containing only changed source files.

From PowerShell in `C:\Users\David\Documents\JaiyePass`:

```powershell
Expand-Archive "$HOME\Downloads\JaiyePass-Production-Hardening-Patch.zip" -DestinationPath "C:\Users\David\Documents\JaiyePass" -Force
powershell -ExecutionPolicy Bypass -File .\release\remove-demo-sources.ps1
npm.cmd install sharp@^0.35.5
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --omit=dev
```

If any command fails, do not deploy.

## 2. Review and apply the database migration

The included `supabase/migrations/20261027000100_production_hardening.sql` **updates database permissions, hides demo events, and creates the ticket email outbox/claim function**. Review it carefully and back up the database first. It requires a linked Supabase project with prior migrations applied. Make sure `supabase status`/dashboard shows the right project before `db push`.

```powershell
npx.cmd supabase migration list --linked
npx.cmd supabase db push --linked
```

Current database at review time: 0 auth users, 0 admins, 0 real events, 8 demo events. The patch only hides the fictional events; it does not delete real users or paid orders. It will leave your catalogue empty until you publish a real event.

## 3. Create the public WebP-only storage bucket

The script reads `.env.local` and uses the service role *server-side only*. Never paste keys into a chat. The first command is a dry-run:

```powershell
node scripts/setup-event-images-bucket.mjs
node scripts/setup-event-images-bucket.mjs --apply
```

If a bucket with the same name exists but incompatible settings, the script refuses to modify it automatically. Review it manually.

## 4. Register the FIRST administrator

Register a real user from `/signup` using your intended admin email and confirm it. Only THEN use the **privileged** Supabase SQL Editor to grant the profile's `admin` role. Follow the commented steps in `release/ADMIN-BOOTSTRAP.sql`. Do not create publicly known admin credentials, hard-code admin IDs, or grant admin from client-side code. Sign out/back in, then open `/admin`.

## 5. Configure actual ticket delivery and payment TEST credentials

Vercel environment variables (server-only, never `NEXT_PUBLIC_`):

- `RESEND_API_KEY` — key for your Resend account.
- `EMAIL_FROM` — e.g. `JaiyePass <tickets@YOUR-VERIFIED-DOMAIN>`; verify the actual domain in Resend first. The default `no-reply@jaiyepass.com` is NOT assumed to be verified.
- `PAYSTACK_SECRET_KEY` — **TEST** secret (`sk_test_...`) until end-to-end QA is complete. Never start with a live key.
- `PAYSTACK_WEBHOOK_SECRET` — optional if using the same Paystack secret; otherwise must match the signature key used for your webhook.
- `TICKET_TOKEN_PEPPER` — preserve the existing long, random secret; changing it invalidates issued QR signatures.
- `NEXT_PUBLIC_APP_URL` — must be the exact public domain for final ticket links.

Configure Paystack TEST webhook at `https://jaiyepass.vercel.app/api/paystack/webhook` ONLY when testing the intended production environment with a test secret. For previews, use the preview webhook URL and a dedicated staging Supabase/Paystack setup; your Vercel Preview currently has no Supabase vars.

## 6. QA before production

1. Register and confirm an account; verify an admin can see real stats.
2. Organizer creates draft, uploads JPG/PNG/WebP, verify Storage contains only `.webp`, then submits for review.
3. Admin verifies organizer, publishes event and checks public listing.
4. Use a Paystack TEST payment for correct amount/currency. Confirm ONE order, right number of tickets, valid QR scans, duplicate scan rejection, and ONE Resend email with PNG per ticket.
5. Replay the same signed webhook. Confirm no extra tickets or duplicate successful delivery.
6. Simulate Resend failure; confirm status `failed` in `/admin/emails`, configure provider correctly, retry, confirm `sent`.
7. Test invalid SVG/GIF/oversized/truncated image files, unauthorized event edits, non-admin `/admin` access, and mobile layouts.
8. Deploy a staging Preview first. **Do not use `vercel --prod` until these pass.**

## Next.js build notes

The patch deliberately omits dependency manifests to retain your already-corrected Next.js 15, Zod and PostCSS versions. Installing direct dependency `sharp@^0.35.5` updates your local manifests/lockfile. The patch was statically parsed, but the full npm build cannot run in this analysis container because npm registry access is unavailable. Run the commands above locally and report failures.

### Verification and sources

- Paystack webhook verification: https://paystack.com/docs/payments/webhooks/
- Paystack transaction verification: https://paystack.com/docs/payments/verify-payments/
- Resend attachments: https://resend.com/docs/send-with-attachments
