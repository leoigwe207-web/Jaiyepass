# JaiyePass — Technical Requirements

**Stack:** Next.js 15 (App Router, RSC + server actions), TypeScript, Tailwind CSS v4, Supabase
(Postgres + Auth + RLS), Paystack (payments), Resend (transactional email), Vitest.

---

## 1. Architecture

```
Browser (RSC + client components)
   │  fetch /api/*  ·  server actions (form actions)
   ▼
Next.js server (Node runtime route handlers & actions)
   ├── service-role Supabase client   (trusted paths only, after authz)
   ├── user-scoped Supabase client    (RLS enforced; cookies)
   ├── Paystack adapter               (init / verify / refund / webhook HMAC)
   └── email adapter                  (Resend; logs clearly when unconfigured)
   ▼
Supabase Postgres — RLS on every table; SECURITY DEFINER functions for
inventory holds, order finalization, and atomic check-in.
```

### Trust rules (non-negotiable)
1. **Amounts are recomputed server-side** from `ticket_types`/`promo_codes` rows; browser totals are
   display-only.
2. **Order state transitions only happen server-side** (service role): clients cannot set `status`.
3. **Payment success = Paystack verify/webhook + amount + currency + reference match**, then the
   idempotent `finalize_paid_order()` function. The webhook signature (HMAC-SHA512 of raw body) is
   validated before any processing.
4. **QR tokens:** payload `<uuid>.<hmac_sha256(uuid, TICKET_TOKEN_PEPPER)>`; only `sha256(payload)`
   is stored. Scanner verifies HMAC first, then claims atomically. A database leak alone cannot mint
   a working code.
5. **Service role client** is imported only in `src/lib/supabase/admin.ts` and used only after an
   explicit server-side authorization check (`getOrgMembership`, `requireAdmin`, ownership test).

## 2. Concurrency & inventory

- `create_inventory_hold()` locks the ticket type row `FOR UPDATE`, expires stale holds, computes
  `quantity − sold − active holds`, and raises on insufficient stock. Holds last 10 minutes.
- `finalize_paid_order()` locks the order, is a no-op when already paid/refunded (idempotent), issues
  one ticket per unit, increments `sold_count`, and marks sold-out types.
- `claim_check_in()` locks the ticket row, validates event match/status, marks used, and inserts a
  `check_ins` row; a partial unique index `(ticket_id) WHERE result='valid'` is the second guard
  against double entry under concurrent scanners.

## 3. Payments (Paystack)

| Concern | Implementation |
|---|---|
| Initialize | `POST /transaction/initialize` server-side; reference stored on the order before redirect |
| Callback | Paystack redirects to `/checkout/[orderId]/success`, which verifies server-side |
| Webhook | `POST /api/paystack/webhook` — signature check → `webhook_events` dedupe (unique provider id) → re-verify via API → finalize |
| Refunds | Host/admin approves → `POST /refund` (full or partial); webhook `refund.processed` reconciles via `provider_reference` |
| Test mode | Without `PAYSTACK_SECRET_KEY`: clearly labelled UI, no provider calls; `/api/dev/complete-order` (development only) simulates success through the same finalize path |
| Idempotency | Unique `webhook_events (provider, provider_event_id)`; finalize is idempotent; duplicates acknowledged 200 |

Amounts are sent to Paystack in **kobo**; verification compares `amount` and `currency` exactly.

## 4. Rate limiting

In-memory sliding window (`src/lib/rate-limit.ts`) with per-IP/per-user keys:
login 10/5m, signup 5/10m, checkout 20/10m, promo 15/5m, scan 120/min, contact 5/15m, report 5/30m.
The call-site interface is stable; back it with Redis/Upstash when scaling horizontally
(documented as a required change for multi-instance deployments).

## 5. Email

Resend API behind `src/lib/email.ts`. Without `RESEND_API_KEY` messages are recorded as `logged`
with an explicit `[EMAIL NOT SENT]` console prefix — delivery is never faked. Templates: receipt +
QR ticket links, refund processed, password reset.

## 6. Security checklist

- [x] RLS enabled on all 26 tables; no client policies on `orders` writes, `webhook_events`, `payouts`, `audit_logs`
- [x] Zod validation on every API route and server action (`src/lib/validation.ts`)
- [x] Server-only imports for secrets (`server-only` enforced by package)
- [x] Profile `role` changes blocked by trigger unless performed by an admin
- [x] Timing-safe HMAC comparisons for QR and webhook signatures
- [x] Rate limits on every mutating public endpoint
- [x] Output escaping handled by React; free text sanitized server-side (`sanitizeText`)
- [x] Passwords ≥10 chars with letters+digits, handled entirely by Supabase Auth (never stored)
- [x] Scanner responses expose first name only (no email/phone) — door privacy
- [x] Audit log for: event review decisions, role changes, verifications, refunds, payouts, scanner assignment, listing hides

## 7. Performance

- Server Components by default; client components only where interactivity requires it
- `force-dynamic` on personalized pages; static rendering for marketing/legal pages
- Browsing queries are single-round with embedded relations (no N+1)
- Images: local demo SVGs; production uploads should use next/image + CDN storage (backlog)
- Target: LCP < 2.5 s on 4G Android; TTFB < 500 ms for event pages

## 8. Environments & configuration

| Variable | Purpose | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | always |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key | always |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role | always (server) |
| `TICKET_TOKEN_PEPPER` | HMAC pepper for QR payloads | always (server) |
| `PAYSTACK_SECRET_KEY` | Paystack secret (absent ⇒ test mode) | real payments |
| `PAYSTACK_WEBHOOK_SECRET` | Webhook HMAC secret (falls back to secret key) | webhooks |
| `RESEND_API_KEY` | Email sending (absent ⇒ logged only) | real email |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (callbacks, links) | always |
| `CONTACT_EMAIL` | Support inbox for /contact | optional |
| `EMAIL_FROM` | From header (default `JaiyePass <no-reply@jaiyepass.com>`) | optional |

## 9. Quality gates

- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest: money math, QR token security, validation schemas, checkout logic
  (holds, promo, verify/finalize), webhook signature+idempotency, scan authorization+claims
- `npm run build` — production build must pass
- Manual E2E script (documented in `docs/09-launch-checklist.md`): signup → buy (test mode) →
  ticket QR → scan → refund → payout, for two distinct attendee accounts (isolation check)

## 10. Scalability notes (post-v1)

- Swap in-memory rate limiting for Redis (interface unchanged)
- Move email/cashier reconciliation to background jobs (pg_cron already available)
- Read replicas for organizer analytics dashboards
- Storage: Supabase Storage (images), CDN in front for posters
