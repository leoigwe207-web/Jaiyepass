-- JaiyePass V2 production hardening (additive and reversible except policy/grant tightening).
-- Review for the intended project before using `supabase db push --linked`.

begin;

-- An authenticated caller used to have table-wide UPDATE/INSERT on profiles.
-- RLS alone does not protect the admin role on INSERT; column restrictions are essential.
revoke insert, update on public.profiles from public, anon, authenticated;
-- Two formerly mutable search paths can be safely pinned: both bodies use
-- explicit schema-qualified extension names or pg_catalog built-ins.
alter function public.hash_ticket_token(text) set search_path = '';
alter function public.touch_updated_at() set search_path = '';
grant insert (id, email, full_name, phone, avatar_url, city, notification_opt_in)
  on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, city, notification_opt_in)
  on public.profiles to authenticated;
alter table public.profiles alter column role set default 'attendee'::public.profile_role;

-- Server-side admin actions use the service-role JWT. Previous trigger blocked
-- those requests because auth.uid() is NULL for service-role calls.
-- Never allow a normal client to mutate its own role, even if other grants drift.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if (new.id is distinct from old.id or new.role is distinct from old.role)
     and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'profile identity and role changes are restricted';
  end if;
  return new;
end;
$$;

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'attendee'::public.profile_role);

-- Restrict legacy fictional events WITHOUT destroying order or audit records.
-- The publication guard rejects hidden status changes made by the migration's
-- postgres login role. Disable ONLY this trigger for the seeded-demo cleanup,
-- then restore it before commit. The surrounding BEGIN/COMMIT makes the
-- trigger state and data updates roll back together on any failure.
-- Remove fictional seed data permanently.
-- Stop if any demo event is associated with an order or ticket.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.events e ON e.id = o.event_id
    WHERE e.is_demo IS TRUE
  ) OR EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.events e ON e.id = t.event_id
    WHERE e.is_demo IS TRUE
  ) THEN
    RAISE EXCEPTION 'Cannot delete demo events with orders or tickets';
  END IF;
END;
$$;

-- Remove fictional events and cascading ticket types.
DELETE FROM public.events
WHERE is_demo IS TRUE;

-- Remove the fictional organizer.
DELETE FROM public.organizations o
WHERE o.slug = 'lagos-after-dark-demo'
  AND o.created_by IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.organization_id = o.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.payouts p
    WHERE p.organization_id = o.id
  );

-- Remove unused venues inserted by the original demo seed.
DELETE FROM public.venues v
WHERE v.name IN (
  'Freedom Park',
  'The Shrine',
  'Eko Atlantic Convention Hall',
  'Landmark Beach',
  'Alliance Francaise'
)
AND NOT EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.venue_id = v.id
);

create table if not exists public.ticket_email_deliveries (
  order_id uuid primary key references public.orders(id) on delete cascade,
  status text not null default 'sending' check (status in ('sending','sent','failed')),
  attempt_count integer not null default 1 check (attempt_count >= 1),
  last_attempt_at timestamptz not null default now(),
  lock_expires_at timestamptz not null default (now() + interval '10 minutes'),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  last_error text
);
create index if not exists ticket_email_deliveries_status_idx
  on public.ticket_email_deliveries(status, updated_at desc);
alter table public.ticket_email_deliveries enable row level security;
revoke all on public.ticket_email_deliveries from public, anon, authenticated;
grant select, insert, update on public.ticket_email_deliveries to service_role;

-- Atomic transactional claim. Repeated paid Paystack callbacks and the
-- success page race safely: one call claims, the others see false.
create or replace function public.claim_ticket_email_delivery(p_order_id uuid)
returns boolean language plpgsql security invoker
set search_path = '' as $$
declare v_claimed uuid;
begin
  if not exists (select 1 from public.orders
                 where id = p_order_id and status = 'paid'::public.order_status)
  then return false; end if;

  insert into public.ticket_email_deliveries(order_id, status, attempt_count,
      last_attempt_at, updated_at, lock_expires_at)
  values (p_order_id, 'sending', 1, now(), now(), now() + interval '10 minutes')
  on conflict (order_id) do update
    set status = 'sending',
        attempt_count = public.ticket_email_deliveries.attempt_count + 1,
        last_attempt_at = now(), updated_at = now(),
        lock_expires_at = now() + interval '10 minutes', last_error = null
    where public.ticket_email_deliveries.status = 'failed'
       or (public.ticket_email_deliveries.status = 'sending'
           and public.ticket_email_deliveries.lock_expires_at < now())
  returning order_id into v_claimed;
  return v_claimed is not null;
end;
$$;
revoke all on function public.claim_ticket_email_delivery(uuid) from public, anon, authenticated;
grant execute on function public.claim_ticket_email_delivery(uuid) to service_role;

notify pgrst, 'reload schema';
commit;
