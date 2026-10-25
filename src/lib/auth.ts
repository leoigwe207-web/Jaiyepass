import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { getDemoUser } from "./demo";

export interface SessionUser {
  id: string;
  email: string;
  role: "attendee" | "admin";
  fullName: string | null;
}

/** Returns the signed-in user's profile, or null. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Preview demo session (fail-closed: only when no DB + not production).
  const demo = await getDemoUser();
  if (demo) {
    return {
      id: `demo-${demo.role}`,
      email: demo.email,
      role: demo.role === "admin" ? "admin" : "attendee",
      fullName: demo.label,
    };
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, role, full_name")
      .eq("id", data.user.id)
      .single();
    if (!profile) return null;
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

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
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
  // Demo host sessions get a placeholder org without touching the database.
  if (userId.startsWith("demo-")) {
    const demo = await getDemoUser();
    if (demo?.role === "host") return "demo-org";
    if (demo) return null;
  }
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
