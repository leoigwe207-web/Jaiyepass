# JaiyePass 🎟️

**Your pass to a good time.** A mobile-first event discovery and ticketing platform for Lagos —
discover events, plan with friends, buy with a clear checkout, enter with a secure QR ticket.
Organizers get sales, attendee lists, promos, door scanners and payouts.

---

## Stack

- **Next.js 15** (App Router, RSC + server actions) · **TypeScript** · **Tailwind CSS v4**
- **Supabase** — Postgres + Auth + Row Level Security (migrations in `supabase/migrations/`)
- **Paystack** — initialize/verify/refunds/webhooks (test mode without keys)
- **Resend** — transactional email (logged locally without keys)
- **Vitest** — unit/integration tests

## Quick start

```bash
npm install
cp .env.example .env.local    # then fill in values (see table below)
npm run dev                   # http://localhost:3000
```

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (server only) | Trusted server paths; never expose |
| `TICKET_TOKEN_PEPPER` | ✅ (server only) | HMAC pepper for QR ticket payloads — rotate carefully |
| `PAYSTACK_SECRET_KEY` | for real payments | **Absent ⇒ clearly-labelled test mode** |
| `PAYSTACK_WEBHOOK_SECRET` | for webhooks | Falls back to `PAYSTACK_SECRET_KEY` |
| `RESEND_API_KEY` | for real email | Absent ⇒ emails logged as `[EMAIL NOT SENT]` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Canonical URL (payment callbacks, links) |
| `CONTACT_EMAIL` / `EMAIL_FROM` | optional | Support inbox / from header |

**Anything that needs live provider credentials:** Paystack payments + refunds + webhooks, email
delivery, production hosting/domain, and Supabase project access. Everything else — including the
full purchase and scan flow — works locally in test mode.

## Database setup

```bash
# Option A — Supabase CLI (from the project root)
supabase link --project-ref <your-ref>
supabase db push          # applies supabase/migrations/0001 → 0005 in order

# Option B — SQL editor: paste each file in order:
#   0001_setup.sql → 0002_tables.sql → 0003_functions.sql
#   0004_rls.sql   → 0005_seed.sql
```

Seeding loads Lagos cities, categories, venues and demo events (flagged `is_demo` in the UI).

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm test             # vitest run (77 tests)
```

## Roles & routes

| Role | Home |
|---|---|
| Visitor | `/`, `/events`, `/collections`, `/events/[slug]` |
| Attendee | `/account/tickets`, `/account/orders`, `/account/saved`, `/account/plans`, `/account/profile`, `/checkout/[orderId]` |
| Host | `/host`, `/host/events`, `/host/events/new`, `/host/events/[id]`, `/host/payouts` |
| Staff scanner | `/scan` (server-validated via `POST /api/scan`) |
| Admin | `/admin` (review queue, hosts, users, payouts, reports, audit) |

Key API routes: `/api/checkout`, `/api/checkout/pay`, `/api/checkout/promo`,
`/api/paystack/webhook`, `/api/refunds`, `/api/saved`, `/api/reports`, `/api/contact`,
`/api/group-plans`, `/api/scan`, `/api/dev/complete-order` (test mode only).

## Security model (short version)

- RLS on every table; client-writable status fields don't exist — order/payment transitions are
  server-side only.
- Payments: Paystack signature → per-event idempotency row → API re-verification of amount,
  currency, reference → idempotent `finalize_paid_order()`.
- QR tickets: `sha256('<uuid>.<hmac(uuid, pepper)>')` stored; raw token only in the QR; scanner
  verifies HMAC before an atomic claim (double-entry impossible).
- Service-role client is confined to `src/lib/supabase/admin.ts` and always preceded by an
  explicit authorization check.
- Rate limits on every public mutating endpoint; zod validation everywhere; admin actions audited.

## Documentation

| Doc | Contents |
|---|---|
| [docs/01-product-requirements.md](docs/01-product-requirements.md) | PRD: personas, scope, metrics |
| [docs/02-technical-requirements.md](docs/02-technical-requirements.md) | Architecture, trust rules, security checklist |
| [docs/03-app-flow.md](docs/03-app-flow.md) | Every user flow as route maps |
| [docs/04-design-brief.md](docs/04-design-brief.md) | Brand, tokens, layout intent, a11y |
| [docs/05-database-schema.md](docs/05-database-schema.md) | Tables, enums, functions, RLS matrix |
| [docs/06-implementation-plan.md](docs/06-implementation-plan.md) | Phases, milestones, risks, backlog |
| [docs/organizer-pitch.md](docs/organizer-pitch.md) | 90-second sales script + objections |
| [docs/pricing-and-maintenance.md](docs/pricing-and-maintenance.md) | Fees, invoice schedule, retainer tiers |
| [docs/launch-checklist.md](docs/launch-checklist.md) | ✅ done vs 🔲 credential/legal work |

## License

Private — all rights reserved (unless otherwise agreed with the client).
