import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export interface SessionUser {
  id: string;
  email: string;
  role: "attendee" | "admin";
  fullName: string | null;
}

/** Returns the signed-in user's profile, or null. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    // Server-only role lookup, restricted to the ID verified by getUser().
    // Never accept a user ID or role from the browser for this check.
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, role, full_name")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || !profile) return null;
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      fullName: profile.full_name,
    };
  } catch {
    return null;
  }
}

export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
    ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/access-denied");
  return user;
}

/**
 * Membership check for host surfaces, evaluated server-side with the service
 * role (so it cannot be tampered with client-side). Returns the member role or null.
 */
export async function getOrgMembership(
  userId: string,
  orgId: string,
): Promise<"owner" | "admin" | "manager" | "scanner" | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return (data?.role as "owner" | "admin" | "manager" | "scanner" | null) ?? null;
}

/** Resolve the host org a user belongs to (single-org MVP simplification). */
export async function getManagedOrgId(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "manager"])
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}

export async function isEventScannerFor(userId: string, eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("event_scanners")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}
