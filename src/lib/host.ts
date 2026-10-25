import "server-only";
import { requireUser, getManagedOrgId, type SessionUser } from "./auth";
import { createAdminClient } from "./supabase/admin";

/** Host dashboard context: the signed-in user and the org they manage. */
export async function getHostContext(): Promise<{
  user: SessionUser;
  orgId: string | null;
}> {
  const user = await requireUser();
  const orgId = await getManagedOrgId(user.id);
  return { user, orgId };
}

/**
 * Available payout balance for an organization, in kobo:
 * paid order totals − processed refunds − payouts already queued/paid.
 */
export async function getOrgBalance(orgId: string): Promise<{
  grossKobo: number;
  refundedKobo: number;
  paidOutKobo: number;
  availableKobo: number;
}> {
  const admin = createAdminClient();

  const [{ data: paid }, { data: refunds }, { data: payouts }] = await Promise.all([
    admin
      .from("orders")
      .select("total_kobo, events!inner(organization_id)")
      .eq("status", "paid")
      .eq("events.organization_id", orgId),
    admin
      .from("refunds")
      .select("amount_kobo, status, orders!inner(events(organization_id))")
      .eq("status", "processed")
      .eq("orders.events.organization_id", orgId),
    admin
      .from("payouts")
      .select("amount_kobo, status")
      .eq("organization_id", orgId)
      .in("status", ["pending", "approved", "processing", "paid"]),
  ]);

  const grossKobo = (paid ?? []).reduce((sum, o) => sum + (o.total_kobo as number), 0);
  const refundedKobo = (refunds ?? []).reduce((sum, r) => sum + (r.amount_kobo as number), 0);
  const paidOutKobo = (payouts ?? []).reduce((sum, p) => sum + (p.amount_kobo as number), 0);

  return {
    grossKobo,
    refundedKobo,
    paidOutKobo,
    availableKobo: Math.max(0, grossKobo - refundedKobo - paidOutKobo),
  };
}
