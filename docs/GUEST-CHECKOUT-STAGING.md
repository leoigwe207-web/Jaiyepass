# Guest checkout — staged rollout

## Staging database test results — 2026-11-04

An isolated, free ($0/month quoted) Supabase project was created in the same organization without copying production customer or payment data. The original nine Jira/JaiyePass schema migrations were applied on staging, followed by `staged/guest_checkout_NOT_APPLIED.sql` and the transactional `staged/20261103_finalize_paid_order_NOT_APPLIED.sql`. **These two staging migrations were not applied to production.**

Database transaction checks passed (test fixtures rolled back afterward):

- Valid anonymous order identity is stored without an auth user ID; malformed guest email rejected by CHECK constraints.
- Two ticket tiers: one regular and two VIP tickets issued with `user_id=NULL`, stock counters updated correctly.
- Repeated finalization of an already-paid order returned `already_finalized` and issued no duplicate tickets.
- Mismatched payment reference rejected; an expired hold rejected with no tickets issued.
- Free guest ticket finalizes once; duplicate callback issues no duplicate.
- Authenticated role without ownership cannot SELECT a guest order via RLS.
- After rollback, public orders, tickets, payments and events each had **zero rows** in staging.

**Not verified:** actual Paystack test-mode payment or webhook, Resend QR email delivery, full browser guest session flow, realistic concurrent checkout traffic. Those need staging Preview secrets and E2E tests, plus production release approval.

The Supabase security adviser still reports six callable SECURITY DEFINER role-helper functions; investigate before release. Staging pause was requested after the tests; verify project status in Supabase before assuming it is paused.


The active application code is in `src/`, not in the earlier `release/guest-map-fix/patch` copies.

## Summary
- Anonymous buyer enters full name and email on the event ticket picker.
- API creates a pending order using a strong 256-bit random bearer token.
- Only a SHA256 token digest is stored in `orders`; the token is an HttpOnly, SameSite=Lax, HTTPS-only (production) cookie. The order ID alone is not authorization.
- Registered user checkout remains unchanged with the feature disabled.
- Guest order access works only on this browser while the cookie is valid; QR tickets are delivered to the booking email after verified payment. No account is manufactured.
- Paystack webhook verifies independently and can complete payment even if the browser loses its session.
- Existing `finalize_paid_order` RPC accepts a nullable `user_id` after the database migration; **the transactional RPC hardening staged under `staged/20261103_finalize_paid_order_NOT_APPLIED.sql` is a separate release prerequisite**.

## Rollout
1. Create a separate Supabase STAGING project, apply its existing base migrations and this `staged/guest_checkout_NOT_APPLIED.sql` there. Don't run it on production.
2. Verify two real auth cases: registered and guest; verify guest cannot access another order or any account/admin route.
3. Configure **test-mode** Paystack, verified transactional sender with Resend, `TICKET_TOKEN_PEPPER`, and the normal Supabase server variables in Vercel Preview. Do not paste credentials in ChatGPT.
4. Set `GUEST_CHECKOUT_ENABLED=true` **in staging only** after all prerequisites work. It must remain absent/false in production until release approval.
5. Test multiple ticket types, no funds charged in real mode, expired holds, repeated webhook, QR attachments, scan once, disabled cookies, invalid email, free-ticket abuse protection and cross-device access.
6. Verify address/search/mobile views, reconciliation and audit records; merge and promote only after the release gate passes.

## Known limitations
- In-memory checkout rate limiting is not multi-instance safe. Before public free guest tickets, use durable rate limits and bot mitigation.
- Guest cookie lasts 24 hours. QR attachments, not a public order ID, are the cross-device ticket delivery mechanism.
- Email delivery relies on verified Resend sender and successful `ticket_email_deliveries` claim; do not claim it worked until tested.
- Promo use currently has non-transactional redemption increments (pre-existing). Requires database atomicity before large campaigns.
- No live payment tests performed; transfer/payout automation remains disabled.
