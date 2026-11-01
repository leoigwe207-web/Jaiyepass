# JaiyePass — Platform Audit & Financial Safety Release

Date: 2026-10-30

**Deployment verdict: NOT READY.** No production code, financial transfer, or database migration was applied in this release. This audit used the supplied JaiyePass source snapshot and subsequent local patch files, live Supabase metadata/advisors and connected Vercel deployment metadata. The user's Windows working tree may contain newer edits not present in that snapshot.

## Competitor comparison (public evidence only)

| Platform | Publicly verified | JaiyePass gap | Priority |
|---|---|---|---|
| Tix Africa | Organizer sales summary separates sales revenue, fees and net; payout account and schedule | Current payout balance incorrectly treats buyer checkout totals as withdrawable | Critical |
| Eventbrite | Finance/payout status and payout bank configuration | No provider reconciliation or bank-account verification | Critical |
| Ticketmaster | Discover by artist/event/venue, date, category and location | Validate category/city/date combinations and mobile search usability | Medium |

Tix help: https://help.tix.africa/en/article/how-to-see-your-ticket-sales-summary-1otjspj/
Eventbrite help: https://www.eventbrite.com/help/en-us/articles/640593/when-do-i-get-paid/
Ticketmaster public site: https://www.ticketmaster.com/

Full mobile checkout and private dashboards could not be inspected with public-only access.

## Confirmed defects and risks

1. **Critical financial accounting**: `getOrgBalance` previously calculated paid order `total_kobo` minus refunds and payouts, ignoring separation of ticket proceeds, checkout fees, provider fees, actual settlement, and platform commission. Never use that balance to authorize transfers.
2. **Critical payout integrity**: `setPayoutStatusAction` previously let administrators mark `paid` without a verified transfer. The payout request itself used a read-then-insert sequence, allowing simultaneous requests to overdraw.
3. **High payment readiness**: Missing `PAYSTACK_SECRET_KEY` on production previously enabled a simulated test-mode interface instead of unambiguously disabling paid checkout. `PAYSTACK_WEBHOOK_SECRET` is not a separate Paystack credential; webhook HMAC uses Paystack secret key.
4. **High authorization review**: Supabase advisor reports six SECURITY DEFINER functions callable by `anon` and six callable by authenticated users (some used by RLS; inspect before revoking grants). `webhook_events` and `ticket_email_deliveries` have RLS but no user policies, potentially intentional service-only isolation.
5. **High abuse protection**: Rate limiting is memory-backed and unsuitable for distributed Vercel production; use a shared atomic store.
6. **High email delivery**: Resend SMTP/sender domain and email provider remain to be configured and tested. QR-email delivery is not live-verified.
7. **High operational release**: Connected GitHub `leoigwe207-web/Jaiyepass` is empty; current Vercel production deployment is older than the local patch collection. The project has not been end-to-end tested at 360/390/768/1024/1440 widths.
8. **Medium source consistency**: Original sample/demo files existed in the supplied historical snapshot. They were removed in the local reconstruction, and have previously been removed by the user's production rebuild script; verify their absence before deploying.
9. **Medium event browsing**: Five primary categories are already active in Supabase, with others deactivated; preserve the original `music`,`comedy`,`nightlife`,`art-culture` slugs for existing URLs. The new `parties` category is separate.

## Implemented in this staged source patch

- A **fail-closed** organizer balance reads reconciled ledger numbers through a service-role-only RPC; if the migration is absent, displays zero withdrawable balance and disables payouts.
- Replaced non-atomic payout creation with an **atomic, row-locked RPC** that requires a verified organizer, a verified bank destination, sufficient reconciled funds and membership.
- Removed direct **Mark paid** and **Processing** admin actions. Added explicit status transition checks and optimistic concurrency. These are now controlled by a future bank-transfer reconciliation worker only.
- Rebuilt the organizer payout summary to distinguish paid orders, ticket proceeds, checkout fees, refunds, processor/platform fees, outstanding reservations, paid-out amounts and verified available funds.
- Added a staged append-only ledger schema, payout-account verification timestamp, service-role-only financial summary and payout reservation RPC. **Not applied to the production database.**
- Prevented production from offering fake Paystack test completion when no key is configured; bound signature validation to the actual integration secret.
- Kept the existing checkout, QR-ticket and event creation features intact.
- Added `tests/payout-safety.test.ts` for permissionless pure transition tests.
- Fixed the previously observed middleware cookie parameter implicit-any annotation.

## Unverified / external dependencies

- Provider-ledger reconciliation service and final transfer webhook handler **not implemented** in this stage; therefore actual organizer withdrawals remain disabled. This is intentionally safer than false balances or unverified paid flags.
- No Paystack test-key credentials were available; no Paystack test charge or refund was issued. No live transfers or payments initiated.
- No functional SMTP/Resend integration test; QR email delivery remains unverified.
- No live mobile browser automation or full Next.js production build in this environment because a dependency install did not complete. The user's earlier 102/102 test result precedes this patch; it is not a post-patch test count.

## Verification and release checklist

1. Back up the working tree and apply this patch locally only, inspect `git diff`.
2. Configure **test** `PAYSTACK_SECRET_KEY` server-side (`sk_test_...`) without sharing it. Add to local `.env.local`, not browser variables. Use separate Vercel Preview environment variables for a test deployment.
3. Run `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd audit --omit=dev` and `npm.cmd run dev` on Windows.
4. Run both admin and attendee logins; create an event, inventory and test order; inspect actual Paystack transaction, verified amount/currency/reference, duplicate webhook handling, order fulfillment, QR scan and email delivery.
5. Review this staged ledger SQL with a database backup; generate a new migration using `npx.cmd supabase migration new organizer_financial_ledger`; **do not push until the reconciliation and bank verification flows have been implemented and approved**. The SQL is not executable automatically by the installer.
6. Reconcile provider settlements and transaction fees with verified references, not placeholders. Verify account holder, bank code/account and applicable compliance before enabling payout requests.
7. Implement Paystack bank recipient verification, verified transfer initiation with explicit approval, transfer.success/failed/reversed handling, settlement reconciliation and a genuine immutable journal of completion evidence.
8. Replace memory-based rate limiting with a shared store; review every privileged RPC and correct any RLS exposure without breaking required functions.
9. Configure verified sending domain, `RESEND_API_KEY`, `EMAIL_FROM` and email callback URLs.
10. Run mobile/desktop automated checks, resolve any regressions, push verified code to the intended GitHub repository, deploy a Vercel **preview**, confirm it, and only then consider production promotion.

## Paystack architecture

- Verified customer **payment** is not provider **settlement**.
- A subaccount transaction **split** routes settlement shares; it is NOT an on-demand organizer withdrawal.
- Bank **transfers** require recipient creation, approval, a transfer reference, final provider status and bank verification.
- Until transfer and settlement confirmation exist, a payout cannot be called paid.

Paystack references:
- https://paystack.com/docs/payments/verify-payments/
- https://paystack.com/docs/payments/webhooks/
- https://paystack.com/docs/payments/split-payments/
- https://paystack.com/docs/transfers/single-transfers/
