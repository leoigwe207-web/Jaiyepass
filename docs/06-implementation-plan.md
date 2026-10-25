# JaiyePass — Implementation Plan

**Status legend:** ✅ built (in this repository) · 🔑 requires provider credentials · 📦 post-v1 backlog.

---

## 1. Work breakdown

### Phase 1 — Foundations ✅
- ✅ Next.js 15 App Router + TypeScript + Tailwind v4 design system (tokens, UI primitives)
- ✅ Supabase migrations 0001–0005: enums, tables, indexes, SECURITY DEFINER business logic, RLS
- ✅ Seed data: Lagos cities, categories, venues, demo events (badged in UI)
- ✅ Server libs: money (kobo), validation (zod), auth helpers, rate limiter, audit log,
  QR token HMAC module, email adapter, Paystack adapter, queries layer

### Phase 2 — Public site & attendee ✅
- ✅ Home (editorial: hero search, collections, featured, city/category rails), browse + filters,
  collections page, event detail (ticket picker, save, share/plan)
- ✅ Static pages: about, contact, help, terms, privacy, refunds, host onboarding
- ✅ Auth: signup / login / reset / confirm flows (Supabase Auth server actions)
- ✅ Account: tickets + QR cards, orders + refund requests, saved, group plans, profile
- ✅ Plan share pages resolved by unguessable `share_code`

### Phase 3 — Checkout & payments ✅ 🔑
- ✅ Holds + pending order creation (`POST /api/checkout`)
- ✅ Checkout page: server-computed totals, promo apply/remove, hold countdown
- ✅ Paystack init (`POST /api/checkout/pay`), success-page verification, webhook with
  signature + idempotency + strict amount/currency checks
- ✅ Refunds: attendee request → host approve/reject → provider refund → webhook reconcile
- ✅ Test mode: labelled flow + `/api/dev/complete-order` (404 when keys exist or in production)
- 🔑 Live payments need `PAYSTACK_SECRET_KEY` (+ webhook secret pointed at the route)

### Phase 4 — Host dashboard ✅**
- ✅ Organizer onboarding (org + owner membership, payout bank details)
- ✅ Event CRUD (draft → submit for review; published edits return to review; cancel)
- ✅ Ticket types (add/pause/resume/close), promo codes, scanner assignment by email
- ✅ Attendees table, refund decisions, sales/balance overview, payout requests
- 🔑 Real payouts depend on verified bank details + manual transfer runbook

### Phase 5 — Admin ✅
- ✅ Review queue with preview + feature toggles; organizer verification; user roles;
  payout state machine; report moderation (resolve/dismiss/hide); audit trail page

### Phase 6 — Scanner ✅**
- ✅ `/scan` mobile page (camera via BarcodeDetector where supported + manual entry),
  server-validated HMAC + atomic claim, recent-scans log, event scoping
- 📦 Offline queue with `synced_offline` (schema ready) — post-v1

### Phase 7 — Quality ✅ (ongoing gate)
- ✅ 77 unit/integration tests: money, QR token security, validation, checkout (holds, promos,
  verify/finalize, mismatch refusals), webhook signature + idempotency, scan authz + claims
- ✅ `npm run typecheck`, `npm run build` gates
- 🔑 Live E2E with real Paystack test keys + real inbox (Resend)

## 2. Milestones to launch

| # | Milestone | Exit criteria |
|---|---|---|
| M1 | Code complete | typecheck + build + all tests green |
| M2 | Supabase project provisioned | migrations applied, seed loaded, RLS smoke-tested (2-account isolation) |
| M3 | Paystack live | init/verify/webhook/refund proven with test card, then ₦1 live charge refunded |
| M4 | Email live | receipt + reset emails land in real inboxes |
| M5 | Pilot event published | organizer verified, event approved, scanner assigned |
| M6 | Door rehearsal | scan 20 codes incl. replay/wrong-event attempts, measure throughput |
| M7 | Launch | checklist `docs/09-launch-checklist.md` fully signed off |

## 3. Ownership & effort (indicative)

| Workstream | Estimate |
|---|---|
| Foundations + schema + RLS | done |
| Public site + auth + account | done |
| Checkout + Paystack + refunds | done (live config pending) |
| Host + admin + scanner | done |
| Tests + docs | done |
| Provider setup + pilot ops + rehearsal | 3–5 days calendar (depends on provider access) |

## 4. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Webhook unreachable from prod domain | Success-page verify shares the idempotent path; Paystack retries; both covered by tests |
| Overselling under load | Row-locked hold function + partial unique check-in index |
| Organizer fraud/chargebacks | Admin review gate to publish; audit trail; refund controls |
| Door connectivity | Manual entry fallback; offline queue is schema-ready (post-v1 build) |
| Single-instance rate limiter | Documented interface swap to Redis at horizontal scale |
| Secrets leakage | server-only modules, no keys in client, service role confined to `lib/supabase/admin.ts` |

## 5. Post-v1 backlog (priority order)

1. Event reminders via `notifications` + email digests
2. Offline scan queue + sync
3. Organizer self-verification (CAC upload) & multiple orgs per user
4. Automatic payouts (daily run after reserve period)
5. Seat/tier types, waitlists, group discounts
6. Redis rate limiting, image CDN uploads, analytics dashboards
