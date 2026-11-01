# JaiyePass — Database Schema

Source of truth: SQL migrations in `supabase/migrations/`
(`20261026090101_setup.sql` → `20261026090102_tables.sql` → `20261026090103_functions.sql` → `20261026090104_rls.sql` → `20261026090105_seed.sql`).
**All money is integer kobo. All ids are UUID. All timestamps are `timestamptz` (UTC).**

---

## 1. Entity overview

```
profiles ──┬── organizations ── organization_members (role: owner|admin|manager|scanner)
           │        └── events ──┬── ticket_types ── inventory_holds
           │              │      ├── promo_codes
           │              │      ├── event_scanners ── (user_id → profiles)
           │              │      └── check_ins ── tickets ── orders ── order_items
           │                                              │        ├── payments
           │                                              │        └── refunds
           ├── saved_events ── (event_id)
           ├── group_plans ── group_plan_members
           ├── event_reports, notifications, audit_logs
           └── payouts (by organization)
reference: cities · categories · venues
ingress:   webhook_events (provider idempotency log)
```

## 2. Core tables

### Identity & platform
| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id (=auth.users.id)`, `email`, `full_name`, `phone`, `avatar_url`, `role ('attendee'\|'admin')`, `city`, `notification_opt_in` | Row created by auth trigger/app; `role` guarded by DB trigger |
| `organizations` | `name`, `slug` unique, `contact_email`, payout bank fields, `verification ('unverified'\|'pending'\|'verified'\|'rejected')`, `created_by` | Host accounts |
| `organization_members` | `organization_id`, `user_id`, `role ('owner'\|'admin'\|'manager'\|'scanner')`, `status ('active'\|'invited'\|'removed')`, unique(org,user) | |
| `cities` / `categories` | `name`, `slug` unique, `is_active`, `sort_order` | Platform-managed reference data |
| `venues` | `name`, `address`, `city_id`, lat/long, `map_url` | Reused across events |

### Catalog
| Table | Key columns | Notes |
|---|---|---|
| `events` | `organization_id`, `venue_id`, `category_id`, `city_id`, `slug` unique, `title`, `tagline`, `description`, `image_url`, `starts_at/ends_at/doors_open_at`, `refund_policy`, `status ('draft'\|'pending_review'\|'approved'\|'rejected'\|'published'\|'cancelled'\|'hidden')`, review fields, `featured`, `is_free`, `is_demo`, `created_by` | CHECK `ends_at > starts_at` |
| `ticket_types` | `event_id`, `name`, `price_kobo`, `quantity`, `sold_count`, `per_order_limit`, `sales_start_at/end_at`, `status ('active'\|'paused'\|'sold_out'\|'closed')`, `sort_order` | CHECK `sold_count <= quantity`, valid sales window |
| `promo_codes` | `organization_id`, `event_id?`, `code`, `kind ('percentage'\|'fixed')`, `value`, `max_redemptions`, `redemptions_used`, window, `is_active` | unique on `(org, upper(code))` |
| `inventory_holds` | `ticket_type_id`, `order_id?`, `quantity`, `status ('active'\|'consumed'\|'expired'\|'released')`, `expires_at` | Partial index on active holds |

### Orders & money
| Table | Key columns | Notes |
|---|---|---|
| `orders` | `user_id`, `event_id`, `status ('pending'\|'awaiting_payment'\|'paid'\|'cancelled'\|'expired'\|'refunded'\|'partially_refunded'\|'failed')`, subtotal/discount/fee/total kobo, `promo_code_id`, `hold_id`, `paystack_reference` unique, `failure_reason`, `status_history jsonb` | **No client insert/update policy — server only** |
| `order_items` | `order_id`, `ticket_type_id`, `name_snapshot`, `unit_price_kobo`, `quantity` | Price snapshot survives later edits |
| `payments` | `order_id`, `reference` unique, `channel`, `amount_kobo`, `status ('pending'\|'success'\|'failed'\|'abandoned'\|'reversed'\|'refunded')`, `provider_payload`, `verified_at` | One per provider transaction attempt |
| `refunds` | `order_id`, `payment_id?`, `amount_kobo`, `status ('requested'\|'approved'\|'rejected'\|'processed'\|'failed')`, `requested_by`, `processed_by`, `provider_reference`, `status_history` | Provider refund id stored for webhook reconciliation |
| `payouts` | `organization_id`, `amount_kobo`, `status ('pending'\|'approved'\|'processing'\|'paid'\|'on_hold'\|'cancelled')`, `reviewed_by`, `status_history` | Writes: service role (admin workflows) |

### Tickets & entry
| Table | Key columns | Notes |
|---|---|---|
| `tickets` | `order_id`, `ticket_type_id`, `event_id`, `user_id`, `token_hash` unique, `status ('issued'\|'used'\|'cancelled'\|'refunded')`, `used_at`, `refunded_at` | `token_hash = sha256('<uuid>.<hmac>')`; raw token never stored |
| `check_ins` | `ticket_id`, `event_id`, `scanner_id`, `result ('valid'\|'already_used'\|'cancelled'\|'refunded'\|'invalid'\|'wrong_event')`, `scanned_at`, `synced_offline`, `conflict_note` | Partial unique index `(ticket_id) WHERE result='valid'` |
| `event_scanners` | `event_id`, `user_id`, `assigned_by`, unique(event,user) | Door staff assignments |

### Social & moderation
| Table | Key columns | Notes |
|---|---|---|
| `saved_events` | PK `(user_id, event_id)` | |
| `group_plans` | `event_id`, `owner_id`, `title`, `note`, `share_code` unique (80-bit random, base64url) | Share link capability |
| `group_plan_members` | `plan_id`, `user_id?`, `name` NOT NULL, `email?`, `going` | Partial uniques: `(plan,user)` where user set; `(plan, lower(name))` for guests |
| `event_reports` | `event_id`, `reporter_id?`, `reason`, `details`, `status ('open'\|'reviewing'\|'resolved'\|'dismissed')` | |
| `notifications` | `user_id`, `kind`, `title`, `body`, `link`, `read_at` | Table ready; fan-out hooks are post-v1 |
| `audit_logs` | `actor_id`, `action`, `entity_type`, `entity_id`, `metadata jsonb` | Append-only |
| `webhook_events` | `provider`, `provider_event_id`, `payload`, `processed`, unique(provider,id) | Delivery dedupe |

## 3. Enum types (0001)

`profile_role, org_role, org_verification, event_status, ticket_type_status, hold_status,
order_status, payment_status, ticket_status, refund_status, checkin_result, payout_status,
report_status, promo_kind, notification_kind, member_status`.

## 4. Security-definer functions (0003)

| Function | Purpose |
|---|---|
| `current_profile_role()`, `is_admin()`, `org_has_role(org, roles[])`, `is_event_scanner(event)`, `is_plan_member(plan)`, `is_plan_owner(plan)` | Recursion-free RLS predicates |
| `expire_inventory_holds()` | Sweeps expired holds; marks linked pending orders expired (safe for cron) |
| `create_inventory_hold(type, qty, minutes)` | Locked, atomic reservation; raises on stock/limit/window violations |
| `finalize_paid_order(order, reference, channel, pepper)` | Idempotent: order→paid, payment→success, hold consumed, tickets issued with HMAC payloads, sold_out marking |
| `claim_check_in(hash, event, scanner)` | Locked validation + check-in row; double-entry impossible |
| `hash_ticket_token(payload)` | SHA-256 helper matching app-side hashing |
| `touch_updated_at()`, `protect_profile_role()` | Triggers |

## 5. Row Level Security matrix (0004)

| Table | Read | Write |
|---|---|---|
| profiles | own / admin | own (role change blocked by trigger) |
| organizations | verified OR own-org members | service role (host actions re-check server-side) |
| organization_members | own / org managers / admin | owner+admin |
| cities, categories, venues | public (active) | admin/service role |
| events | published OR org member OR assigned scanner OR admin | org owner/admin/manager (insert limited to draft/pending_review) |
| ticket_types | via visible event | org owner/admin/manager |
| orders, order_items, payments, refunds | own order / admin | **service role only** |
| tickets | own OR org member OR admin | SECURITY DEFINER functions only |
| inventory_holds | own order / admin | SECURITY DEFINER only |
| promo_codes | own org / admin | org owner/admin/manager |
| check_ins | event org / assigned scanner / admin | `claim_check_in()` only |
| event_scanners | own assignments / event org | event org (assign/unassign) |
| saved_events, notifications | own | own |
| group_plans | owner / member / admin | owner |
| group_plan_members | owner / member / self / admin | insert: plan exists + self; delete: self |
| event_reports | reporter / admin | insert: any signed-in; update: admin |
| payouts, audit_logs, webhook_events | admin / none | service role only |

Grants: `anon`/`authenticated` get USAGE + SELECT where policies apply; mutations are otherwise
reachable only through the service role or SECURITY DEFINER functions.

## 6. Indexes of note

`orders(user_id, created_at desc)`, `orders(event_id, status)`, `payments(order_id)`,
`tickets(user_id, created_at desc)`, `tickets(event_id, status)`, `inventory_holds_active_idx
(type, expires_at) WHERE active`, `check_ins(event_id, scanned_at desc)`,
partial uniques on check-in and group-plan members, `promo_codes_code_uniq(org, upper(code))`.

## 7. Seed data (0005)

Lagos cities (Ikoyi… depending on seed), categories (Afrobeats, Comedy, Tech, Food, Sports…),
venues, ~8 demo events with ticket types across price tiers — all flagged `is_demo = true` and
badged in the UI until organizers replace them.

## 8. Operational notes

- Migrations apply cleanly in order on a fresh Supabase project (`supabase db push` or SQL editor).
- Future change: schedule `expire_inventory_holds()` (pg_cron every minute) — the app also calls it
  lazily inside hold creation, so this is an optimization, not a correctness requirement.
- `notifications` and `synced_offline` are schema-ready for post-v1 features (event reminders;
  offline scan sync).
