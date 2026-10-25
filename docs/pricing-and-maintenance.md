# JaiyePass — Pricing, Invoice & Payment Plan

Commercial terms for building and maintaining the platform. Figures are in **USD** for
portability; naira equivalents are set at invoice time at the prevailing CBN reference rate.

---

## 1. Platform fee (revenue share — no monthly cost to organizers)

| Item | Amount |
|---|---|
| Service fee per paid ticket | **2.5% of ticket price, capped at ₦2,000** |
| Who pays it | The buyer (added at checkout, shown as "Service fee") |
| Free tickets | **₦0** — free events are always free to list and attend |
| Setup / listing / monthly fee | **None** |

Net to organizer: ticket price (less any promo discount) — the service fee is charged on top.
Platform keeps the fee; Paystack's processing charges (~1.5% + ₦100 local) are deducted from
settlement and are the platform's cost of payment delivery.

## 2. Development invoice (one-time build)

| # | Milestone | Deliverable | Payment | Amount (USD) |
|---|---|---|---|---|
| 1 | Kickoff & foundations | Signed scope, schema + design system approved | On signing (40%) | $2,400 |
| 2 | Feature-complete build | Demo of all five roles end-to-end (test mode) | On acceptance (40%) | $2,400 |
| 3 | Launch handover | Live on production domain, docs, training call, 14-day warranty starts | At launch (20%) | $1,200 |
| | | **Total** | | **$6,000** |

- Milestone 2 acceptance: `typecheck + build + test suite green`, checklist items marked
  "completed" verified in a live walkthrough.
- Change requests outside the PRD scope are quoted separately at $60/hour before work starts.

## 3. Maintenance & operations (monthly retainer)

| Tier | Price/month | Includes |
|---|---|---|
| **Care** | $250 | Monitoring, dependency/security patches, uptime + backup checks, 2 small fixes/mo, email support (48 h) |
| **Growth** *(recommended)* | $600 | Everything in Care + 10 dev hours (features, funnel work, collection strategy), conversion/performance review monthly, priority support (24 h), on-call during your flagship events |
| **Scale** | $1,200 | Everything in Growth + 25 dev hours, SLA 4 h, door-day standby, quarterly roadmap session |

- 3-month minimum on Growth/Scale; month-to-month on Care.
- Third-party costs (Supabase, hosting, domain, Resend, Paystack) are billed at cost or run on
  the client's own accounts (preferred — keeps credentials in your name).

## 4. Payment terms

1. Invoices issued per milestone (Section 2) and monthly in advance (Section 3).
2. Payment within **5 business days** via bank transfer; work pauses after 7 days overdue.
3. Launch warranty: **14 days** of bug fixes at no charge for issues in delivered scope.
4. Intellectual property transfers in full on final milestone payment; source is in your
   repository from day one (no lock-in).
5. Either party may end a retainer with 30 days' notice; outstanding milestones remain due.

## 5. Example economics (illustrative)

A 1,500-seat event at ₦10,000/ticket:

```
Gross ticket revenue                 ₦15,000,000
Service fee (2.5%, cap ₦2,000/ticket) ₦  3,000,000  → platform revenue
Paystack processing (est. ~1.6%)      ₦- 240,000  → cost
Net platform margin                   ₦ 2,760,000  before ops
Organizer receives                    ₦15,000,000  (fee was buyer-paid)
```

Care tier alone is covered by **one** mid-size event per quarter; everything above that is margin.
