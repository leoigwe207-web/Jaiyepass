-- 0006_harden_rpc.sql: hardened execution permissions for SECURITY DEFINER RPCs.
-- Apply after 0001–0005. Existing data is not modified.
-- Without REVOKE from PUBLIC, Postgres functions are callable by everyone by default.
BEGIN;

-- High-risk functions must be callable only by trusted server's service_role.
REVOKE ALL ON FUNCTION public.finalize_paid_order(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_check_in(text,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_inventory_hold(uuid,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_inventory_holds() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_check_in(text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_inventory_hold(uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_inventory_holds() TO service_role;

-- Keep internal trigger functions non-callable over the Data API.
REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Public RLS helper functions only need explicit request-role access.
REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.org_has_role(uuid,public.org_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_event_scanner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_plan_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_plan_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_has_role(uuid,public.org_role[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_scanner(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_plan_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_plan_owner(uuid) TO anon, authenticated;


-- A client can supply profiles.role on INSERT. RLS (id = auth.uid()) alone
-- does not prevent that, and the original trigger only checks UPDATE.
CREATE OR REPLACE FUNCTION public.prevent_profile_insert_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role <> 'attendee'::public.profile_role AND
     COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'profile role cannot be set during signup';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_guard_role_insert ON public.profiles;
CREATE TRIGGER profiles_guard_role_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_insert_escalation();
REVOKE ALL ON FUNCTION public.prevent_profile_insert_escalation() FROM PUBLIC, anon, authenticated;

-- A service-role operation must be able to bootstrap/manage administrators,
-- while self-service callers cannot change their own role.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_admin()
     AND COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'role changes require platform administrator';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;

-- A host editing their event must not skip review by changing status directly.
-- Server-side admin actions may publish after required moderation.
CREATE OR REPLACE FUNCTION public.protect_event_publication()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('approved','published','hidden')
     AND NOT public.is_admin()
     AND COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'publication and moderation require platform administrator';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS events_protect_publication ON public.events;
CREATE TRIGGER events_protect_publication
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.protect_event_publication();
REVOKE ALL ON FUNCTION public.protect_event_publication() FROM PUBLIC, anon, authenticated;

COMMIT;
