# JaiyePass — Product Requirements Document (PRD)

**Version:** 1.0 · **Date:** October 2026 · **Market:** Lagos, Nigeria (expandable across Nigeria and Africa)
**Tagline:** Your pass to a good time.

---

## 1. Problem

Planning a night out in Lagos is fragmented: events are discovered on Instagram stories and WhatsApp
broadcasts, plans are coordinated in group chats with no single source of truth, tickets arrive as
screenshots that get forwarded around, and organizers manage entry with spreadsheets and torn paper.
Scalpers resell screenshots, doors grind to a halt, and organizers cannot trust their own numbers.

## 2. Product promise

JaiyePass helps people **discover events, make plans with friends, and enter events with a secure
digital ticket** — while giving organizers **reliable tools to sell tickets and run entry**.

## 3. Users (personas)

| Role | Needs |
|---|---|
| **Visitor** | Browse public events/collections; see price, venue, date fast on a phone |
| **Attendee** | Buy tickets with a clear phone checkout; store QR tickets; save events; share/create group plans |
| **Host (organizer)** | Create events, sell tickets, see attendees and sales, run promos, pay out |
| **Host staff/scanner** | Scan and validate tickets **only** for assigned events, on a phone, at the door |
| **Admin** | Review listings, manage users/organizers, handle reports, monitor payouts, audit actions |

## 4. What makes the product different

1. **Personal, social discovery** — curated collections ("Tonight in Lagos", "For the crew",
   "Date night", "Free this weekend", "Under ₦10,000") instead of an infinite undifferentiated grid.
2. **Group plans** — one tap from an event creates a shareable plan link; friends join and see who's
   going without creating a group chat.
3. **Fast, honest checkout** — quantities only from the attendee; all prices, fees and discounts are
   recomputed server-side; tickets are held for 10 minutes while paying.
4. **Tickets that can't be forwarded** — QR payloads are HMAC-signed per ticket; only a hash is
   stored; the door scanner verifies cryptographically before lookup.

We deliberately do not clone any existing ticketing layout or brand.

## 5. Scope (v1)

### In scope
- Public site: home (editorial + collections), browse/search with filters, event detail, static pages
  (about, contact, help, terms, privacy, refunds, host onboarding).
- Auth: email/password signup, login, password reset, email confirmation (Supabase Auth).
- Attendee account: tickets + QR, orders/receipts, saved events, group plans, profile.
- Checkout: inventory holds, promo codes, Paystack payments (initialize/verify/webhook), refunds.
- Social: share event link, create/join group plans via share code.
- Host dashboard: organizer onboarding, event CRUD + review submission, ticket types, promo codes,
  scanner assignment, attendees, refund review, payout requests.
- Admin: review queue, organizer verification, user roles, payout decisions, report moderation,
  featured toggles, append-only audit log.
- Scanner: mobile scan page (camera where supported + manual entry), atomic check-in, recent log.
- Money in NGN, integer kobo throughout; platform fee 2.5% capped at ₦2,000 charged to the buyer.

### Out of scope for v1 (documented backlog)
- Multiple organizations per user, team invitations with granular permissions
- Seat maps, tables, tiers with waitlists
- Native apps (PWA-optimized web only)
- Automatic bank payouts (manual review + transfer in v1)
- Offline-first scanning with sync queue (v1 requires connectivity; designed for in schema)
- Multi-currency, installment payments, group invoicing

## 6. Success metrics

| Metric | Target (first 90 days post-launch) |
|---|---|
| Event → checkout start rate | ≥ 8% of event page views |
| Checkout completion (started → paid) | ≥ 70% |
| Median door throughput | ≤ 6 s per attendee (scan + confirm) |
| Payment disputes (unresolved) | 0 |
| Organizer activation (signup → first published event) | ≥ 50% |

## 7. Constraints & principles

- **Trust:** never display a success the database/provider has not confirmed. Test mode is visibly
  labelled and can never silently issue real tickets in production.
- **Phone first:** every critical flow (browse → buy → ticket → scan) designed at 360 px first.
- **Money integrity:** no float currency; browser-submitted totals are never trusted.
- **Least privilege:** attendee data is visible to organizers only for their own events; scanner
  pages expose first names only; admin actions are audited.
- **Operable without credentials:** the whole app builds and demos locally without Paystack/Resend
  keys (labelled test mode), so development is never blocked on provider access.

## 8. Roles & permissions matrix

| Capability | Visitor | Attendee | Scanner | Host (owner/admin/manager) | Admin |
|---|---|---|---|---|---|
| Browse published events | ✓ | ✓ | ✓ | ✓ | ✓ |
| Save events / create plans | – | ✓ | ✓ | ✓ | ✓ |
| Buy tickets | – | ✓ | ✓ | ✓ | ✓ |
| Scan tickets | – | – | Assigned events only | Own org's events | ✓ |
| Create/edit events | – | – | – | Own org | ✓ |
| Approve/refund payments | – | Request | – | Own org (approve/reject) | ✓ |
| Publish listings | – | – | – | – | ✓ |
| Verify organizers, change roles, payouts | – | – | – | Request own | ✓ |

## 9. Open questions (tracked for post-v1)

1. Should organizers be able to self-verify with CAC documents (automation vs manual review)?
2. Do we offer ticket insurance/add-ons?
3. At what GMV tier do automatic payouts become safe?
