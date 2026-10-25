# JaiyePass — Launch Checklist

Two buckets, kept honest: **✅ Completed in code** vs **🔲 Requires Paystack / email / hosting /
domain / legal setup**. Nothing in bucket 2 can be checked from this repository alone.

---

## A. Completed in code ✅

- [x] Product, technical, flow, design, schema, plan documents (`docs/01`–`docs/06`)
- [x] Database migrations 0001–0005 with RLS on all tables + SECURITY DEFINER business logic
- [x] Public site: home, browse/search, collections, event detail, 7 static pages
- [x] Auth flows: signup, login, reset, email-confirm routing
- [x] Attendee account: tickets + QR, orders, saved, group plans, profile
- [x] Checkout: inventory holds, server-side totals, promo codes, hold countdown
- [x] Paystack integration: init, success-page verify, signed idempotent webhook, refunds
- [x] Test-mode flow that cannot issue tickets when live keys exist (route returns 404)
- [x] Host dashboard: onboarding, event CRUD + review flow, tickets, promos, scanners,
      attendees, refunds, balances, payout requests
- [x] Admin: review queue + preview, organizer verification, user roles, payout decisions,
      report moderation (incl. hide listing), audit log
- [x] Scanner: mobile page (camera + manual), HMAC verification, atomic check-in, event scoping
- [x] Rate limits on all public mutating endpoints; input validation everywhere
- [x] 77 automated tests green; `typecheck` + production `build` gates
- [x] README with setup, env var names, and migration instructions

## B. Requires external accounts / credentials 🔲

### Paystack
- [ ] Business account + KYC (CAC certificate, ID, bank account) approved by Paystack
- [ ] Live secret key → `PAYSTACK_SECRET_KEY`; webhook secret → `PAYSTACK_WEBHOOK_SECRET`
- [ ] Dashboard webhook URL `https://<domain>/api/paystack/webhook` (events: `charge.success`, `refund.processed`)
- [ ] Test-card E2E (init → callback → webhook → ticket) on staging, then ₦1 live charge + refund
- [ ] Settlement account confirmed; refund policy mirrored in Paystack dashboard

### Email (Resend)
- [ ] Resend account, domain verified (SPF/DKIM/DMARC for `jaiyepass.com`)
- [ ] `RESEND_API_KEY` set; `EMAIL_FROM` uses the verified domain; `CONTACT_EMAIL` inbox live
- [ ] Deliverability check: receipt + reset mail land in Gmail/Outlook (not Promotions/Spam)

### Hosting & domain
- [ ] Production hosting with Node runtime + cron capability for Next.js 15 (Vercel/Fly/Render/VPS)
- [ ] Domain `jaiyepass.com` registered + DNS pointed; SSL active
- [ ] `NEXT_PUBLIC_APP_URL` set to the canonical https URL (Paystack callbacks depend on it)
- [ ] Environment variables configured as secrets in the host; separate staging project
- [ ] Uptime monitoring + error alerting (e.g. Better Stack/Sentry) and daily Supabase backups on

### Supabase (staging + production)
- [ ] Project created; migrations applied in order; seed loaded
- [ ] Auth settings: site URL + redirect URLs for confirm/reset; email templates reviewed
- [ ] Two-account RLS isolation verified (user A cannot read user B's tickets/orders/plans)
- [ ] Signed-out 401s verified on every private API route
- [ ] `expire_inventory_holds()` scheduled (pg_cron, every minute) — optional but recommended

### Legal / business
- [ ] Registered business (CAC) — required for Paystack payout approval
- [ ] Terms of Service, Privacy Policy, Refund Policy reviewed by counsel for Nigerian law
      (PAPEAM/data-protection obligations)
- [ ] Fees + payout schedule published on the pricing/onboarding pages (already drafted)
- [ ] Content-moderation runbook: report SLA, refund SLA, organizer revocation policy
- [ ] Tax position confirmed (VAT/withholding treatment of fees) with an accountant

### Operational readiness
- [ ] Pilot organizer verified + one real event published through the review queue
- [ ] Door rehearsal: 20 scans incl. replay attempt, wrong-event code, and a refunded ticket
- [ ] Support inbox staffed; canned replies for payment, refund, and lost-ticket cases
- [ ] Refund runbook: host approve → Paystack refund → webhook reconcile → payout adjustment
- [ ] Rollback plan: how to unpublish an event and pause sales in < 60 seconds

## C. Go / no-go (launch day)

| Check | Owner | Status |
|---|---|---|
| typecheck + build + tests green on main | engineering | 🔲 |
| Live Paystack charge succeeds and webhook fires | engineering | 🔲 |
| Receipt email arrives from verified domain | ops | 🔲 |
| Two-account data isolation spot-check | engineering | 🔲 |
| Scanner assigned and rehearsed for the pilot event | ops + organizer | 🔲 |
| Monitoring + alert channel live | ops | 🔲 |
| Legal pages linked in footer and accepted at signup | product | 🔲 |
| **Launch decision** | | **🔲** |
