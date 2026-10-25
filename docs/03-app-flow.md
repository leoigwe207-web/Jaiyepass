# JaiyePass — App Flow

Every flow is phone-first; arrows show the real routes in the codebase.

---

## 1. Discovery (Visitor)

```
/  (editorial home: hero search, collections, featured, city/category strips)
 ├─ /events            browse grid + filters (q, city, category, date, price, availability)
 ├─ /collections       curated collections ("Tonight in Lagos", "Under ₦10,000", …)
 ├─ /events/[slug]     event detail: poster, date/venue, refund policy, ticket picker,
 │                     save ♥, share ↗ + "Make a group plan"
 ├─ /about /contact /help /terms /privacy /refunds /host-onboarding
 └─ (signed-in) ♥ → POST /api/saved  ·  share → native share or /api/group-plans
```

Ticket picker → `POST /api/checkout` → server creates order + 10-minute holds → redirect
`/checkout/[orderId]`.

## 2. Purchase (Attendee)

```
/checkout/[orderId]
 ├─ summary: items, subtotal, discount, fee, total  (server-computed)
 ├─ promo:   POST /api/checkout/promo  (apply / REMOVE) → refreshed totals
 ├─ pay:     POST /api/checkout/pay → Paystack authorization_url → redirect
 │             (test mode: labelled "Simulate payment" → POST /api/dev/complete-order)
 └─ hold countdown; expired hold → back to event page
        │
        ▼
Paystack → /checkout/[orderId]/success
 ├─ live keys: verifyAndFinalizeOrder() server-side (same idempotent path as webhook)
 └─ webhook /api/paystack/webhook: signature → dedupe → re-verify → finalize
        │
        ▼
paid → tickets issued (one per unit, signed QR) → receipt email (tickets + links)
        │
        ▼
/account/tickets  QR card per ticket · /account/orders receipt + "Request refund"
```

**Failure paths:** amount/currency mismatch → loud log, no tickets; failed/abandoned charge → order
marked `failed` with reason; duplicate webhook → 200 acknowledged, no reprocessing.

## 3. Group plans (Social)

```
Event page → "Make a group plan" → POST /api/group-plans → { shareCode }
   → /plans/[shareCode]  (capability link: resolve by unguessable share_code)
        ├─ anyone with link: see event + who's going (first names)
        ├─ signed-in → JoinPlanAction (first name stored, no email)
        └─ CopyLinkButton / share sheet
/account/plans → plans created + joined, "Open plan"
```

## 4. Attendee account

```
/account            (nav: Tickets, Orders, Saved, Plans, Profile)
/account/tickets    QR per ticket; used tickets greyed; "Get help" deep-links to order
/account/orders     status chips, refund request (window: >48 h before start)
/account/saved      saved events grid (empty → browse CTA)
/account/profile    name, phone, notification opt-in; password reset email link
```

## 5. Host (organizer)

```
/host  (no org yet → onboarding form → POST createOrganizationAction → owner membership)
 ├─ overview: verification state, gross/refunded/available balances, recent sales,
 │            pending refund banner
 ├─ /host/events                 list with status chips + sold/gross
 ├─ /host/events/new             event form (city/venue/dates) → draft
 ├─ /host/events/[id]            manage:
 │     tickets   add/pause/resume/close types
 │     promos    create/toggle percentage or fixed codes
 │     scanners  assign by email (needs an account), remove
 │     refunds   approve (calls Paystack refund) / reject
 │     attendees table (name + email — host visibility for their event only)
 │     submit for review / cancel event
 ├─ /host/events/[id]/edit       edit → published events return to pending_review
 └─ /host/payouts                balances + request payout (owner/admin) + history
```

Verification: `unverified → pending → verified|rejected` (admin). Events publish only via admin
review (`pending_review → published`), keeping quality control centralized at launch.

## 6. Scanner (door staff)

```
/scan (mobile) → assigned events (event_scanners) or own org's events
 ├─ camera: BarcodeDetector (Chromium) continuous QR detection, haptic feedback
 ├─ manual: paste code (fallback everywhere else)
 └─ POST /api/scan { payload, eventId }
      1. authz: scanner assigned to THIS event (or host/admin) → else 403 + audit
      2. HMAC signature verify (TICKET_TOKEN_PEPPER) → forged ⇒ "invalid", no DB claim
      3. claim_check_in() atomic → valid | already_used(+time) | wrong_event |
         cancelled | refunded | invalid
 └─ recent scans log (result chips) for the selected event
```

## 7. Admin

```
/admin (requireAdmin)
 ├─ review queue: pending events → approve&publish / reject (+note), preview any listing,
 │                feature toggle for homepage
 ├─ /admin/hosts    organizer verification (verify/reject/reset)
 ├─ /admin/users    search list, roles (make/demote admin; DB trigger protects role column)
 ├─ /admin/payouts  approve → processing → paid / hold / cancel (bank transfer manual)
 ├─ /admin/reports  resolve / dismiss / hide listing (event → hidden)
 └─ /admin/audit    append-only audit trail (actor, action, entity, metadata)
```

## 8. Money lifecycle (single picture)

```
hold (10 min) → order pending → awaiting_payment (reference stored)
   → paid (verify+finalize: tickets, sold_count, hold consumed)
        ├→ refunded (host approves → Paystack refund → webhook confirms → tickets refunded)
        └→ failed / expired / cancelled (holds released, stock returned)
payouts: available = Σ paid totals − processed refunds − payouts queued/paid
         → request (owner/admin) → admin review → manual bank transfer → marked paid
```

## 9. Key error/edge behaviors

| Situation | Behavior |
|---|---|
| Two attendees race for last ticket | Row lock in `create_inventory_hold`; loser gets a friendly 409 |
| Paystack webhook arrives before success page | Both call idempotent finalize; first wins, second `already_finalized` |
| User closes browser during payment | Order keeps `awaiting_payment`; "Complete payment" from /account/orders re-enters (reference reused) |
| Hold expired before paying | Checkout shows expiry + "Start a new order"; cron/app calls `expire_inventory_holds()` |
| QR shown for wrong event | `wrong_event` result, logged, no entry |
| Refund inside 48 h of start | Blocked with message (policy shown on listing) |
| No Paystack keys (dev) | Test mode banner; dev-complete route; production returns 404 for it |
