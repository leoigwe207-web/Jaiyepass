import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Trusted database status: user-editable signup metadata never grants permissions. */
export async function isOrganizationActive(orgId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("organizations")
    .select("verification")
    .eq("id", orgId)
    .maybeSingle();
  return !error && data?.verification === "verified";
}
