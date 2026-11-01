# JaiyePass Guest Checkout, Google Maps, Event UX — review patch

## What has been verified remotely

- Supabase bucket `event-images` created (public read, normalized WebP only, 3MiB maximum); images are uploaded by service-role route after host authorization, never public bucket inserts.
- Supabase migration `20261030204452_repair_inventory_hold_timestamp` applied, adding `inventory_holds.updated_at`.
- A 1-ticket hold was successfully created and released against an active event; zero holds left active afterward.

## Files staged here

- Guest checkout via buyer name and email, cookie-bound order access, no required registration. Signed-in account checkout remains available.
- Event start only (no "Ends" input), while preserving historical end dates on existing listings until edited.
- Venue map iframe, Google Maps directions link, never guessing geocoordinates.
- Premium event artwork placeholder and file input.
- Server-side price and stock checks remain. No unauthenticated access to other orders.
- Guest QR attachments after *verified* payment; requires Resend and correct email sender configuration.
- More accurate checkout hold messaging; disabled misleading payment simulation.

## Important: Pending schema, not applied

`STAGED-GUEST-DATES.sql` is REQUIRED before using the guest feature or start-only event editor. Review it and run in a staging DB first. It makes `orders.user_id`, `tickets.user_id`, and `events.ends_at` nullable and adds guest credential columns and checks. DO NOT deploy the patch without that schema.

Recommended order:
1. Back up your local project and DB.
2. Extract this ZIP into the project root. You can install **UI-only** improvements immediately with `powershell -ExecutionPolicy Bypass -File .\release\guest-map-fix\apply.ps1 -UIOnly` (maps, cover placeholder, inventory migration sync).
3. Review `release/guest-map-fix/STAGED-GUEST-DATES.sql`, apply to *staging*, test there. Make a Supabase migration with `npx supabase migration new guest_checkout_dates` when approved; do not apply twice.
4. Apply local source with `powershell -ExecutionPolicy Bypass -File .\release\guest-map-fix\apply.ps1 -Apply`.
5. Run `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build`.
6. Test host uploads, venue maps, guest checkout, Paystack test payments and duplicate webhooks, QR-email delivery, and mobile.
7. Only after successful tests schedule production migration and deploy. No production deployments performed.

**Required:** PAYSTACK_SECRET_KEY=`sk_test_...`; RESEND_API_KEY and verified EMAIL_FROM. Never expose keys or commit `.env.local`.

## Limitations

- Full Next.js build and browser/Paystack integration tests could not be run in the patch authoring environment (npm dependency install failed). Syntax of all 134 TS/TSX source files parsed successfully, and a guest-token crypto smoke test passed. Existing user's prior run had 105 passing tests, before this new patch.
- Google Maps search based on organizer address may match more than one place. Confirm precise venue address.
- Guest orders are protected by an HttpOnly per-order cookie; tickets are delivered by email attachments. Clearing cookies removes browser checkout access, not emailed QR attachment access.
- Existing refund/guest order-recovery workflows need separate review before general availability.
