-- 0003_functions.sql — concurrency-safe business logic
-- Everything that mutates inventory, money, or check-in state goes through
-- these SECURITY DEFINER functions so atomicity lives in the database.

-- ── Role helper predicates (used by RLS policies in 0004) ───────────────────
-- SECURITY DEFINER so policies on profiles/organization_members do not recurse.

create or replace function public.current_profile_role()
returns public.profile_role
language sql security definer
set search_path = public
stable
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.is_admin()
returns boolean
language sql security definer
set search_path = public
stable
as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false); $$;

create or replace function public.org_has_role(p_org uuid, p_roles public.org_role[])
returns boolean
language sql security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(p_roles)
  );
$$;

create or replace function public.is_event_scanner(p_event uuid)
returns boolean
language sql security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.event_scanners s
    where s.event_id = p_event and s.user_id = auth.uid()
  );
$$;

-- ── updated_at maintenance ───────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','organizations','organization_members','venues','events',
    'ticket_types','orders','payments','refunds','tickets','promo_codes','payouts']
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch', t);
  end loop;
end;
$$;

-- ── Expire stale holds (idempotent; safe to call from cron or app) ───────────
create or replace function public.expire_inventory_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  with expired as (
    update public.inventory_holds
       set status = 'expired', updated_at = now()
     where status = 'active' and expires_at <= now()
    returning id
  ) select count(*) into n from expired;

  update public.orders
     set status = 'expired', updated_at = now()
   where status in ('pending','awaiting_payment')
     and hold_id in (select id from public.inventory_holds where status = 'expired');
  return n;
end;
$$;

-- ── Create a hold: reserve quantity atomically ───────────────────────────────
-- Locks the ticket_types row FOR UPDATE, expires stale holds, computes
-- availability (quantity - sold - active holds), and raises if insufficient.
-- p_minutes: hold lifetime in minutes (default 10).
create or replace function public.create_inventory_hold(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_minutes integer default 10
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tt record;
  held integer;
  v_hold uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  select id, quantity, sold_count, status, per_order_limit, sales_start_at, sales_end_at
    into tt
    from public.ticket_types
   where id = p_ticket_type_id
   for update;

  if not found then
    raise exception 'ticket type not found';
  end if;
  if tt.status <> 'active' then
    raise exception 'ticket sales are not open';
  end if;
  if tt.sales_start_at is not null and now() < tt.sales_start_at then
    raise exception 'ticket sales have not started';
  end if;
  if tt.sales_end_at is not null and now() >= tt.sales_end_at then
    raise exception 'ticket sales have ended';
  end if;
  if p_quantity > tt.per_order_limit then
    raise exception 'quantity exceeds per-order limit of %', tt.per_order_limit;
  end if;

  perform public.expire_inventory_holds();

  select coalesce(sum(quantity), 0) into held
    from public.inventory_holds
   where ticket_type_id = p_ticket_type_id
     and status = 'active'
     and expires_at > now();

  if tt.sold_count + held + p_quantity > tt.quantity then
    raise exception 'not enough tickets available';
  end if;

  insert into public.inventory_holds (ticket_type_id, quantity, expires_at)
  values (p_ticket_type_id, p_quantity, now() + (p_minutes || ' minutes')::interval)
  returning id into v_hold;

  return v_hold;
end;
$$;

-- ── Finalize a verified payment: issue tickets, consume hold, mark paid ──────
-- Idempotent: if the order is already paid, it returns immediately and never
-- issues extra tickets. Called only after provider verification succeeds.
--
-- QR token design: payload = '<ticket_uuid>.<hmac_sha256_hex(ticket_uuid, pepper)>'.
-- Only sha256(payload) is stored (token_hash). The app can re-derive the payload
-- for any ticket it owns from the ticket id + server pepper, and the scanner
-- verifies the HMAC before looking it up — so a database leak alone cannot
-- produce forgeable QR codes, and no raw token or personal data is stored.
-- p_pepper must be the TICKET_TOKEN_PEPPER server secret.
create or replace function public.finalize_paid_order(
  p_order_id uuid,
  p_reference text,
  p_channel text default null,
  p_pepper text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  item record;
  v_ticket_id uuid;
  v_payload text;
  issued integer := 0;
  i integer;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order not found';
  end if;

  -- Idempotency guard: never issue twice.
  if o.status in ('paid','refunded') then
    return jsonb_build_object('status', 'already_finalized', 'order_id', o.id);
  end if;

  update public.orders
     set status = 'paid', paystack_reference = coalesce(p_reference, paystack_reference),
         updated_at = now()
   where id = o.id;

  update public.payments
     set status = 'success', verified_at = now(), channel = coalesce(p_channel, channel), updated_at = now()
   where reference = p_reference;

  if o.hold_id is not null then
    update public.inventory_holds set status = 'consumed', updated_at = now()
     where id = o.hold_id and status = 'active';
  end if;

  -- Issue one ticket per unit, with a 256-bit unguessable token.
  for item in
    select * from public.order_items where order_id = o.id
  loop
    update public.ticket_types
       set sold_count = sold_count + item.quantity, updated_at = now()
     where id = item.ticket_type_id;

    for i in 1..item.quantity loop
      v_ticket_id := gen_random_uuid();
      v_payload := v_ticket_id::text || '.' ||
                   encode(hmac(v_ticket_id::text, p_pepper, 'sha256'), 'hex');
      insert into public.tickets (id, order_id, ticket_type_id, event_id, user_id, token_hash)
      values (v_ticket_id, o.id, item.ticket_type_id, o.event_id, o.user_id,
              public.hash_ticket_token(v_payload));
      issued := issued + 1;
    end loop;
  end loop;

  -- Mark sold-out ticket types once their inventory is exhausted.
  update public.ticket_types
     set status = 'sold_out', updated_at = now()
   where event_id = o.event_id
     and status = 'active'
     and sold_count >= quantity;

  return jsonb_build_object('status', 'paid', 'order_id', o.id, 'tickets_issued', issued);
end;
$$;

-- ── Atomic check-in ──────────────────────────────────────────────────────────
-- Locks the ticket row FOR UPDATE, validates it against the event, then either
-- marks it used and records a 'valid' check-in, or records the rejection
-- result. The unique partial index on check_ins(ticket_id) where result='valid'
-- is a second line of defense against double entry. Unknown tokens return
-- 'invalid' without a check_in row (no ticket exists to reference).
create or replace function public.claim_check_in(
  p_token_hash text,
  p_event_id uuid,
  p_scanner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  v_result public.checkin_result;
begin
  select id, event_id, status, used_at into t
    from public.tickets
   where token_hash = p_token_hash
   for update;

  if not found then
    -- Unknown token: nothing to lock or log against a ticket FK.
    return jsonb_build_object('result', 'invalid', 'ticket_id', null);
  end if;

  if t.event_id <> p_event_id then
    v_result := 'wrong_event';
  elsif t.status = 'used' then
    v_result := 'already_used';
  elsif t.status = 'cancelled' then
    v_result := 'cancelled';
  elsif t.status = 'refunded' then
    v_result := 'refunded';
  else
    v_result := 'valid';
  end if;

  if v_result = 'valid' then
    update public.tickets set status = 'used', used_at = now(), updated_at = now()
     where id = t.id;
  end if;

  begin
    insert into public.check_ins (ticket_id, event_id, scanner_id, result)
    values (t.id, p_event_id, p_scanner_id, v_result);
  exception when unique_violation then
    v_result := 'already_used';
  end;

  return jsonb_build_object('result', v_result, 'ticket_id', t.id);
end;
$$;

-- ── Ticket token hashing (matches app-side SHA-256 hex) ──────────────────────
-- Defined before finalize_paid_order is used, but kept at the end for clarity
-- of reading order; PostgreSQL resolves function references at runtime.
create or replace function public.hash_ticket_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;
