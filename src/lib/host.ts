import "server-only";
import { requireUser, getManagedOrgId, type SessionUser } from "./auth";
import { createAdminClient } from "./supabase/admin";
import { safeAmountKobo } from "./payout-safety";

export async function getHostContext(): Promise<{ user: SessionUser; orgId: string | null }> {
  const user = await requireUser();
  const orgId = await getManagedOrgId(user.id);
  return { user, orgId };
}

/**
 * The ONLY withdrawable amount is verified, reconciled money in the ledger,
 * less outstanding payout reservations. Never infer withdrawability from
 * total checkout charges, pending provider settlement or net sales.
 */
export async function getOrgBalance(orgId: string): Promise<{
  grossKobo: number;
  ticketRevenueKobo: number;
  checkoutFeesKobo: number;
  refundedKobo: number;
  paidOutKobo: number;
  reservedKobo: number;
  processorFeesKobo: number;
  platformFeesKobo: number;
  availableKobo: number;
  settledNetKobo: number;
  paidOrderCount: number;
  ledgerReady: boolean;
}> {
  const empty = {
    grossKobo: 0, ticketRevenueKobo: 0, checkoutFeesKobo: 0,
    refundedKobo: 0, paidOutKobo: 0, reservedKobo: 0,
    processorFeesKobo: 0, platformFeesKobo: 0,
    availableKobo: 0, settledNetKobo: 0,
    paidOrderCount: 0, ledgerReady: false,
  };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_org_finance_snapshot", { p_org_id: orgId });
  // Fail closed until a reviewed migration creates the ledger RPC.
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return empty;
  const v = data as Record<string, unknown>;
  return {
    grossKobo: safeAmountKobo(v.gross_kobo),
    ticketRevenueKobo: safeAmountKobo(v.ticket_revenue_kobo),
    checkoutFeesKobo: safeAmountKobo(v.checkout_fees_kobo),
    refundedKobo: safeAmountKobo(v.refunded_kobo),
    paidOutKobo: safeAmountKobo(v.paid_out_kobo),
    reservedKobo: safeAmountKobo(v.reserved_kobo),
    processorFeesKobo: safeAmountKobo(v.processor_fees_kobo),
    platformFeesKobo: safeAmountKobo(v.platform_fees_kobo),
    availableKobo: safeAmountKobo(v.available_kobo),
    settledNetKobo: safeAmountKobo(v.settled_net_kobo),
    paidOrderCount: safeAmountKobo(v.paid_order_count),
    ledgerReady: true,
  };
}
