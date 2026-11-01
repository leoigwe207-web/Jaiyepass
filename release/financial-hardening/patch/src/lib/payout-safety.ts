/** Safe payout decisions independent of React, Supabase or a payment gateway. */
export type PayoutStage = "pending" | "approved" | "processing" | "paid" | "on_hold" | "cancelled";

// "paid" is intentionally NEVER an interactive admin action. A separate
// provider-confirmed reconciliation worker must finalize an actual transfer.
const allowed: Record<PayoutStage, readonly PayoutStage[]> = {
  pending: ["approved", "on_hold", "cancelled"],
  approved: ["on_hold", "cancelled"],
  processing: ["on_hold"],
  on_hold: ["approved", "cancelled"],
  paid: [],
  cancelled: [],
};

export function canManuallyChangePayout(from: string, to: string): boolean {
  if (!(from in allowed)) return false;
  return allowed[from as PayoutStage].includes(to as PayoutStage);
}

export function safeAmountKobo(value: unknown): number {
  const n = typeof value === "number" ? value : NaN;
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}
