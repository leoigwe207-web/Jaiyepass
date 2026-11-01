-- JaiyePass — READ ONLY post-migration checks (SQL Editor).
-- No database changes. Expect 25 public tables and all public tables with RLS enabled.
select count(*) as public_tables,
       count(*) filter (where c.relrowsecurity) as tables_with_rls,
       count(*) filter (where not c.relrowsecurity) as tables_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p');

-- The following must all return false for anon and authenticated.
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as user_can_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_can_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('create_inventory_hold', 'expire_inventory_holds',
                    'finalize_paid_order', 'claim_check_in')
order by p.proname;

-- Three security triggers must exist and be enabled.
select c.relname as table_name, t.tgname as trigger_name, t.tgenabled
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
 and t.tgname in ('profiles_guard_role_insert','profiles_protect_role','events_protect_publication')
order by c.relname,t.tgname;

-- Verify event rows (demo means illustrative, never purchase).
select is_demo, status, count(*) as events
from public.events
group by is_demo,status
order by is_demo,status;

-- Check recorded migration history (if applied via Supabase CLI).
select version, name from supabase_migrations.schema_migrations order by version;
