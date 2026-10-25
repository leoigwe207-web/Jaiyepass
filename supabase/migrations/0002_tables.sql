-- 0002_tables.sql — core schema
-- All money columns are integer kobo. All tables have created_at/updated_at.

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role public.profile_role not null default 'attendee',
  city text,
  notification_opt_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── organizations (host accounts) ────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  contact_email text not null,
  contact_phone text,
  payout_bank_name text,
  payout_account_number text,
  payout_account_name text,
  verification public.org_verification not null default 'unverified',
  verification_note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.org_role not null,
  status public.member_status not null default 'active',
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ── cities & categories (platform-managed) ───────────────────────────────────
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  country text not null default 'Nigeria',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── venues ───────────────────────────────────────────────────────────────────
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city_id uuid references public.cities(id) on delete restrict,
  latitude double precision,
  longitude double precision,
  map_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── events ───────────────────────────────────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  city_id uuid references public.cities(id) on delete restrict,
  slug text not null unique,
  title text not null,
  tagline text,
  description text not null default '',
  image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  doors_open_at timestamptz,
  age_guidance text,
  refund_policy text not null default 'Refunds are available up to 48 hours before the event starts, unless otherwise stated by the host.',
  status public.event_status not null default 'draft',
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  featured boolean not null default false,
  is_free boolean not null default false,
  -- Demo content ships with the schema and is labelled in the UI until
  -- organizers replace it with real listings.
  is_demo boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_dates_valid check (ends_at > starts_at)
);

-- ── ticket types ─────────────────────────────────────────────────────────────
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price_kobo integer not null check (price_kobo >= 0),
  currency text not null default 'NGN',
  quantity integer not null check (quantity > 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  per_order_limit integer not null default 10 check (per_order_limit > 0),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  status public.ticket_type_status not null default 'active',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sold_lte_quantity check (sold_count <= quantity),
  constraint sales_window_valid check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
);

-- ── inventory holds (expiring reservations) ──────────────────────────────────
create table public.inventory_holds (
  id uuid primary key default gen_random_uuid(),
  ticket_type_id uuid not null references public.ticket_types(id) on delete cascade,
  order_id uuid,
  quantity integer not null check (quantity > 0),
  status public.hold_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index inventory_holds_active_idx on public.inventory_holds (ticket_type_id, expires_at) where status = 'active';

-- ── orders ───────────────────────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  status public.order_status not null default 'pending',
  subtotal_kobo integer not null check (subtotal_kobo >= 0),
  discount_kobo integer not null default 0 check (discount_kobo >= 0),
  fee_kobo integer not null default 0 check (fee_kobo >= 0),
  total_kobo integer not null check (total_kobo >= 0),
  currency text not null default 'NGN',
  promo_code_id uuid,
  hold_id uuid references public.inventory_holds(id) on delete set null,
  paystack_reference text unique,
  failure_reason text,
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_event_idx on public.orders (event_id, status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  name_snapshot text not null,
  unit_price_kobo integer not null check (unit_price_kobo >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

alter table public.inventory_holds
  add constraint inventory_holds_order_fk
  foreign key (order_id) references public.orders(id) on delete set null;

-- ── payments & refunds ───────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  reference text not null unique,
  channel text,
  amount_kobo integer not null check (amount_kobo >= 0),
  currency text not null default 'NGN',
  status public.payment_status not null default 'pending',
  provider_payload jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete set null,
  amount_kobo integer not null check (amount_kobo > 0),
  reason text,
  status public.refund_status not null default 'requested',
  requested_by uuid references public.profiles(id) on delete set null,
  processed_by uuid references public.profiles(id) on delete set null,
  provider_reference text,
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);

-- ── tickets ──────────────────────────────────────────────────────────────────
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  -- SHA-256 hex of the raw token; the raw token only ever lives in the QR code
  -- and is returned to the owner at issuance time. Never store the raw token.
  token_hash text not null unique,
  status public.ticket_status not null default 'issued',
  used_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tickets_user_idx on public.tickets (user_id, created_at desc);
create index tickets_event_idx on public.tickets (event_id, status);
create index tickets_order_idx on public.tickets (order_id);

-- ── promo codes ──────────────────────────────────────────────────────────────
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  code text not null,
  kind public.promo_kind not null,
  value integer not null check (value > 0), -- percent (<=100) or kobo off
  max_redemptions integer,
  redemptions_used integer not null default 0 check (redemptions_used >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index promo_codes_code_uniq on public.promo_codes (organization_id, upper(code));

-- ── check-ins ────────────────────────────────────────────────────────────────
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  scanner_id uuid references public.profiles(id) on delete set null,
  result public.checkin_result not null,
  scanned_at timestamptz not null default now(),
  synced_offline boolean not null default false,
  conflict_note text
);
-- At most one successful check-in per ticket, even with concurrent scanners:
-- enforced both by unique index and by the atomic claim function.
create unique index check_ins_one_valid_uniq on public.check_ins (ticket_id) where result = 'valid';
create index check_ins_event_idx on public.check_ins (event_id, scanned_at desc);

create table public.event_scanners (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ── social: saved events & group plans ───────────────────────────────────────
create table public.saved_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table public.group_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  note text,
  share_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.group_plan_members (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.group_plans(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  going boolean,
  created_at timestamptz not null default now()
);
-- One row per member per plan: anonymous invitees (no user_id) are deduped on
-- name instead, via unique index below.
create unique index group_plan_members_member_uniq
  on public.group_plan_members (plan_id, user_id) where user_id is not null;
create unique index group_plan_members_guest_uniq
  on public.group_plan_members (plan_id, lower(name)) where user_id is null;

-- ── reports, notifications, payouts, audit ───────────────────────────────────
create table public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc) where read_at is null;

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  amount_kobo integer not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  status public.payout_status not null default 'pending',
  reason text,
  reference text unique,
  reviewed_by uuid references public.profiles(id) on delete set null,
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payouts_org_idx on public.payouts (organization_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

-- ── webhook event log (idempotency for provider callbacks) ───────────────────
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);
