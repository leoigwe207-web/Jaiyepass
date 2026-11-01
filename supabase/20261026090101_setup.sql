-- 0001_setup.sql — extensions, enum types, and role-helper functions
-- JaiyePass · Lagos, Nigeria · all money in kobo (integer minor units)

create extension if not exists "pgcrypto";

-- ── Enum types ───────────────────────────────────────────────────────────────
create type public.profile_role as enum ('attendee', 'admin');
create type public.org_role as enum ('owner', 'admin', 'manager', 'scanner');
create type public.org_verification as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.event_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'published', 'cancelled', 'hidden');
create type public.ticket_type_status as enum ('active', 'paused', 'sold_out', 'closed');
create type public.hold_status as enum ('active', 'consumed', 'expired', 'released');
create type public.order_status as enum ('pending', 'awaiting_payment', 'paid', 'cancelled', 'expired', 'refunded', 'partially_refunded', 'failed');
create type public.payment_status as enum ('pending', 'success', 'failed', 'abandoned', 'reversed', 'refunded');
create type public.ticket_status as enum ('issued', 'used', 'cancelled', 'refunded');
create type public.refund_status as enum ('requested', 'approved', 'rejected', 'processed', 'failed');
create type public.checkin_result as enum ('valid', 'already_used', 'cancelled', 'refunded', 'invalid', 'wrong_event');
create type public.payout_status as enum ('pending', 'approved', 'processing', 'paid', 'on_hold', 'cancelled');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.promo_kind as enum ('percentage', 'fixed');
create type public.notification_kind as enum ('order_paid', 'ticket_issued', 'event_reminder', 'event_update', 'refund_processed', 'plan_invite', 'host_message', 'system');
create type public.member_status as enum ('active', 'invited', 'removed');

-- Role helper functions (org_has_role, is_admin, is_event_scanner, current_profile_role)
-- live in 0003_functions.sql, after the tables they read have been created.
