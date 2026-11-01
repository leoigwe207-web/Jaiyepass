-- FIRST REGISTER AN ACCOUNT using /signup and confirm its email.
-- Run this ONLY in Supabase's privileged SQL Editor for the correct project.
-- Do NOT run it against public API or let users call it.
-- Replace ADMIN_EMAIL_GOES_HERE with the new account's actual address.
-- This SQL doesn't create user accounts or reveal credentials.
-- Check the returned row count: exactly one profile must be updated.

begin;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles
   set role = 'admin'::public.profile_role
 where id = (
   select id from auth.users
    where email = 'ADMIN_EMAIL_GOES_HERE'
 );
commit;

select id, email, role from public.profiles where role = 'admin';
