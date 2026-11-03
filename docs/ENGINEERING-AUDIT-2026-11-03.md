# JaiyePass Engineering Audit — 2026-11-03

**Status:** NOT READY. All SQL in `staged/` is review-only and has not been executed.

## Verified source defects
- Anonymous customers cannot buy: checkout POST requires a session; order and ticket owners are NOT NULL in production.
- Test payment CTA targets a removed `/api/dev/complete-order` route. Now replaced with a clear configuration notice.
- The existing `finalize_paid_order` marks paid, increments `sold_count` and issues tickets without checking every hold is active or within capacity. A **replacement is staged** under `staged/20261103_finalize_paid_order_NOT_APPLIED.sql`.
- Paystack webhook did not bind its incoming reference to the order's stored reference. Guarded in source.
- A subsequent provider verification did not compare Paystack's returned reference. Guarded in source.
- Payment initialization could proceed after a hold expired. Guarded in source.
- Checkout order link to hold rows could fail silently. Now checked.
- Promo lookup selected a nonexistent `orders.organization_id` column, and accepted promo edits after payment initialization. Now corrected (atomic promo-redemption still needs DB work).
- Email delivery requires verified sender / Resend key. Cannot claim QR email is production tested.
- Payout ledger RPC is absent; organizer withdrawals properly remain paused. Do not calculate withdrawable money from unpaid or unsettled orders.
- Database advisor shows 6 SECURITY DEFINER helper functions executable by anon/authenticated; verify their use in RLS before changing grants. Webhook/email tables have service-only RLS with no user policies.

## Source changes in audit/security-ux-2026-11-03
- `src/lib/checkout.ts` — reference, hold, payment safety checks.
- `src/app/api/paystack/webhook/route.ts` — bind webhook to reference.
- `src/app/api/checkout/promo/route.ts` — valid schema query, freeze after initialization.
- `src/components/checkout/checkout-panel.tsx` — no dead simulation.
- `src/components/ticket-picker.tsx` — clear reservation message.
- `src/components/event-artwork.tsx`, `src/components/ui.tsx`, `src/components/event-card.tsx`, `src/lib/queries.ts`, `src/app/globals.css` — original category-specific artwork fallback and broken image recovery.
- `tests/checkout.test.ts`, `tests/webhook.test.ts` — reference mismatch regression tests.
- `.github/workflows/ci.yml` — typecheck, tests, build, dependency audit.

## Mandatory release gates
1. Staging database migration and PostgreSQL transaction tests (expiry, two tiers, retries, race conditions, refund reconciliation).
2. Configure `PAYSTACK_SECRET_KEY=sk_test_...` in testing environment only, and verified email service. Never paste keys or use `NEXT_PUBLIC_` for secrets.
3. Verify signed Paystack webhook, real test-mode payment, QR-email delivery, double-delivery retries and scan once semantics.
4. Complete guest checkout and end-time optional migration safely; full guest authorization and email access tests.
5. Configure immutable ledger, reconciled settlement imports, verified bank recipient and manual payout approvals. Do not automate transfers.
6. Test 360 / 390 / 768 / 1024 / 1440px in a real browser, keyboard navigation, contrast, auth roles, and full admin and host paths.
7. Resolve rate limiting shared across serverless nodes, promo race conditions, and scanner roles.

## Competitor references
- Tix Africa: city discovery, organizer publishing and checkout.
- Ticketmaster: search by event/venue and location/date, all-in fee disclosure.
- Eventbrite: homepage inaccessible through public fetch (429), flows not claimed verified.
- Paystack official docs: verify reference, currency, amount; HMAC webhook signature; transfers require final status confirmation.
- Refero and Motion.dev: UX patterns and reduced-motion-aware interaction patterns; do not clone copyrighted assets.
