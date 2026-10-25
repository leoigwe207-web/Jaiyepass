-- 0004_rls.sql — Row Level Security + least-privilege grants
-- Policy model:
--   * public   → read published/active reference data only
--   * attendee → own rows only
--   * host     → rows owned by their organization(s)
--   * scanner  → check-in capability only for assigned events
--   * admin    → full read/write, all mutations audited in app layer
-- Destructive writes on production data are never part of these policies.

-- ── Helper predicates ────────────────────────────────────────────────────────
-- (org_has_role / is_admin / is_event_scanner defined in 0001)

-- SECURITY DEFINER so the group_plans ↔ group_plan_members policies do not
-- recurse into each other: a plain subquery would evaluate the other table's
-- policy, which queries back this table, forever.
create or replace function public.is_plan_member(p_plan uuid)
returns boolean
language sql security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_plan_members
    where plan_id = p_plan and user_id = auth.uid()
  );
$$;

create or replace function public.is_plan_owner(p_plan uuid)
returns boolean
language sql security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_plans
    where id = p_plan and owner_id = auth.uid()
  );
$$;

-- ── Enable RLS everywhere ────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','organization_members','cities','categories','venues',
    'events','ticket_types','inventory_holds','orders','order_items','tickets',
    'payments','refunds','promo_codes','check_ins','event_scanners','saved_events',
    'group_plans','group_plan_members','event_reports','notifications','payouts',
    'audit_logs','webhook_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    -- NOTE: no FORCE. The SECURITY DEFINER business functions in 0003 are
    -- owned by the table owner and must bypass RLS to do atomic work.
  end loop;
end;
$$;

-- ── profiles ─────────────────────────────────────────────────────────────────
create policy "profiles read own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles insert own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());
-- The update policy alone would allow role escalation; the trigger below
-- blocks any change to `role` unless performed by an admin.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role changes require admin';
  end if;
  return new;
end;
$$;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ── organizations ────────────────────────────────────────────────────────────
create policy "orgs read approved public" on public.organizations
  for select using (verification = 'verified' or org_has_role(id, array['owner','admin','manager','scanner']::public.org_role[]));

-- ── organization_members ─────────────────────────────────────────────────────
create policy "members read own orgs" on public.organization_members
  for select using (
    user_id = auth.uid()
    or org_has_role(organization_id, array['owner','admin','manager']::public.org_role[])
    or public.is_admin()
  );
create policy "org owners manage members" on public.organization_members
  for insert with check (org_has_role(organization_id, array['owner','admin']::public.org_role[]));
create policy "org owners update members" on public.organization_members
  for update using (org_has_role(organization_id, array['owner','admin']::public.org_role[]));
create policy "org owners remove members" on public.organization_members
  for delete using (org_has_role(organization_id, array['owner','admin']::public.org_role[]));

-- ── cities & categories (public reference data) ──────────────────────────────
create policy "cities readable" on public.cities for select using (is_active or public.is_admin());
create policy "categories readable" on public.categories for select using (is_active or public.is_admin());

-- ── venues ───────────────────────────────────────────────────────────────────
create policy "venues readable" on public.venues for select using (true);
create policy "org managers write venues" on public.venues
  for insert with check (public.is_admin());

-- ── events ───────────────────────────────────────────────────────────────────
create policy "public read published events" on public.events
  for select using (
    status = 'published'
    or org_has_role(organization_id, array['owner','admin','manager','scanner']::public.org_role[])
    or public.is_event_scanner(id)
    or public.is_admin()
  );
create policy "orgs create events" on public.events
  for insert with check (
    org_has_role(organization_id, array['owner','admin','manager']::public.org_role[])
    and status in ('draft','pending_review')
  );
create policy "orgs update own events" on public.events
  for update using (org_has_role(organization_id, array['owner','admin','manager']::public.org_role[]))
  with check (org_has_role(organization_id, array['owner','admin','manager']::public.org_role[]));
create policy "orgs delete own drafts" on public.events
  for delete using (
    org_has_role(organization_id, array['owner','admin']::public.org_role[])
    and status in ('draft','rejected')
  );

-- ── ticket_types ─────────────────────────────────────────────────────────────
create policy "ticket types readable" on public.ticket_types
  for select using (
    exists (
      select 1 from public.events e
       where e.id = event_id
         and (e.status = 'published'
              or org_has_role(e.organization_id, array['owner','admin','manager','scanner']::public.org_role[])
              or public.is_admin())
    )
  );
create policy "orgs manage own ticket types" on public.ticket_types
  for insert with check (
    exists (select 1 from public.events e where e.id = event_id
             and org_has_role(e.organization_id, array['owner','admin','manager']::public.org_role[]))
  );
create policy "orgs update own ticket types" on public.ticket_types
  for update using (
    exists (select 1 from public.events e where e.id = event_id
             and org_has_role(e.organization_id, array['owner','admin','manager']::public.org_role[]))
  );
create policy "orgs delete own ticket types" on public.ticket_types
  for delete using (
    exists (select 1 from public.events e where e.id = event_id
             and org_has_role(e.organization_id, array['owner','admin']::public.org_role[]))
  );

-- ── inventory_holds ──────────────────────────────────────────────────────────
-- Holds are created/updated only through SECURITY DEFINER functions (which
-- bypass RLS); users may read holds tied to their own orders.
create policy "holds read via own order" on public.inventory_holds
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or public.is_admin()
  );

-- ── orders ───────────────────────────────────────────────────────────────────
create policy "orders read own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
-- Inserts happen via server routes with service role; still scope to owner.
-- Orders are created and transitioned exclusively by server routes using the
-- service role (which bypasses RLS): status must never be client-writable,
-- otherwise a user could mark their own order paid. Clients only read theirs.

-- ── order_items ──────────────────────────────────────────────────────────────
create policy "order items read own order" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
    or public.is_admin()
  );

-- ── payments ─────────────────────────────────────────────────────────────────
create policy "payments read own order" on public.payments
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
    or public.is_admin()
  );

-- ── refunds ──────────────────────────────────────────────────────────────────
create policy "refunds read own order" on public.refunds
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
    or public.is_admin()
  );

-- ── tickets ──────────────────────────────────────────────────────────────────
create policy "tickets read own" on public.tickets
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.events e where e.id = event_id
                and org_has_role(e.organization_id, array['owner','admin','manager','scanner']::public.org_role[]))
  );
-- Mutations to tickets go only through SECURITY DEFINER functions.

-- ── promo_codes ──────────────────────────────────────────────────────────────
-- Promo validation happens server-side with the service role; clients only
-- see their own org's codes (or all of them, as admin).
create policy "orgs read own promos" on public.promo_codes
  for select using (
    org_has_role(organization_id, array['owner','admin','manager']::public.org_role[])
    or public.is_admin()
  );
create policy "orgs manage own promos" on public.promo_codes
  for insert with check (org_has_role(organization_id, array['owner','admin','manager']::public.org_role[]));
create policy "orgs update own promos" on public.promo_codes
  for update using (org_has_role(organization_id, array['owner','admin','manager']::public.org_role[]));

-- ── check_ins ────────────────────────────────────────────────────────────────
create policy "checkins read assigned event" on public.check_ins
  for select using (
    public.is_admin()
    or exists (select 1 from public.events e where e.id = event_id
                and org_has_role(e.organization_id, array['owner','admin','manager']::public.org_role[]))
    or public.is_event_scanner(event_id)
  );
-- Insert/update only via claim_check_in() SECURITY DEFINER function.

-- ── event_scanners ───────────────────────────────────────────────────────────
create policy "scanners read own assignments" on public.event_scanners
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.events e where e.id = event_id
                and org_has_role(e.organization_id, array['owner','admin','manager']::public.org_role[]))
  );
create policy "orgs assign scanners" on public.event_scanners
  for insert with check (
    exists (select 1 from public.events e where e.id = event_id
             and org_has_role(e.organization_id, array['owner','admin','manager']::public.org_role[]))
  );
create policy "orgs unassign scanners" on public.event_scanners
  for delete using (
    exists (select 1 from public.events e where e.id = event_id
             and org_has_role(e.organization_id, array['owner','admin','manager']::public.org_role[]))
  );

-- ── saved_events ─────────────────────────────────────────────────────────────
create policy "saved read own" on public.saved_events for select using (user_id = auth.uid());
create policy "saved insert own" on public.saved_events for insert with check (user_id = auth.uid());
create policy "saved delete own" on public.saved_events for delete using (user_id = auth.uid());

-- ── group_plans ──────────────────────────────────────────────────────────────
create policy "plans read own or shareable" on public.group_plans
  for select using (
    owner_id = auth.uid()
    or public.is_admin()
    -- Members can read plans they joined (share links resolve server-side).
    or public.is_plan_member(id)
  );
create policy "plans insert own" on public.group_plans
  for insert with check (owner_id = auth.uid());
create policy "plans update own" on public.group_plans
  for update using (owner_id = auth.uid());
create policy "plans delete own" on public.group_plans
  for delete using (owner_id = auth.uid());

-- ── group_plan_members ───────────────────────────────────────────────────────
create policy "plan members read own plans" on public.group_plan_members
  for select using (
    public.is_plan_owner(plan_id)
    or (user_id is not null and user_id = auth.uid())
    -- Fellow members of the same plan can see who else is going.
    or public.is_plan_member(plan_id)
    or public.is_admin()
  );
create policy "plan members join" on public.group_plan_members
  for insert with check (
    exists (select 1 from public.group_plans p where p.id = plan_id)
    and (user_id is null or user_id = auth.uid())
  );
create policy "plan members leave" on public.group_plan_members
  for delete using (user_id is not null and user_id = auth.uid());

-- ── event_reports ────────────────────────────────────────────────────────────
create policy "reports insert any logged-in" on public.event_reports
  for insert with check (auth.uid() is not null and (reporter_id = auth.uid() or reporter_id is null));
create policy "reports read own or admin" on public.event_reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy "admins update reports" on public.event_reports
  for update using (public.is_admin());

-- ── notifications ────────────────────────────────────────────────────────────
create policy "notifications read own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications update own" on public.notifications for update using (user_id = auth.uid());
create policy "notifications delete own" on public.notifications for delete using (user_id = auth.uid());

-- ── payouts ──────────────────────────────────────────────────────────────────
create policy "payouts read own org or admin" on public.payouts
  for select using (org_has_role(organization_id, array['owner','admin']::public.org_role[]) or public.is_admin());
-- Writes: service role only (admin-controlled server workflows).

-- ── audit_logs ───────────────────────────────────────────────────────────────
create policy "audit read admin" on public.audit_logs for select using (public.is_admin());
-- Writes: service role / SECURITY DEFINER only.

-- ── webhook_events ───────────────────────────────────────────────────────────
-- No client policies: service role only (webhook route).

-- ── Grants: authenticated gets table access; RLS does the scoping ────────────
-- anon: read-only on public reference data via policies.
grant usage on schema public to anon, authenticated;
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','organization_members','cities','categories','venues',
    'events','ticket_types','inventory_holds','orders','order_items','tickets',
    'payments','refunds','promo_codes','check_ins','event_scanners','saved_events',
    'group_plans','group_plan_members','event_reports','notifications','payouts'
  ]
  loop
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;

  foreach t in array array[
    'profiles','organizations','organization_members','events','venues','ticket_types',
    'orders','saved_events','group_plans','group_plan_members','event_reports','notifications'
  ]
  loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;

  -- Strictly admin/service-role tables: no client DML at all.
  foreach t in array array['audit_logs','webhook_events','payouts','payments','refunds','check_ins','inventory_holds']
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;

-- Functions: allow authenticated to call the safe app functions.
grant execute on function public.create_inventory_hold(uuid, integer, integer) to authenticated;
grant execute on function public.expire_inventory_holds() to authenticated;
grant execute on function public.hash_ticket_token(text) to authenticated;
-- finalize + check-in are invoked from server routes using the service role.
