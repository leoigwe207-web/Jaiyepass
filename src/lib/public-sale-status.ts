/** Public ticket availability must be based on the sales window and stock,
 * not just the organizer's "active" tier status.
 * In particular, Array.every() on an empty list must never imply "sold out".
 */
export interface SaleWindowTier {
  status: string;
  quantity: number;
  sold_count: number;
  sales_start_at: string | null;
  sales_end_at: string | null;
}

export type PublicSaleStatus = "available" | "few" | "upcoming" | "sold_out" | "closed";

export function getPublicSaleStatus(tiers: SaleWindowTier[], nowMs = Date.now()): {
  status: PublicSaleStatus;
  selling: SaleWindowTier[];
  inStock: SaleWindowTier[];
  remaining: number;
  nextOpenMs: number | null;
} {
  const relevant = tiers.filter((t) => t.status === "active" || t.status === "sold_out");
  const selling = relevant.filter((t) =>
    (!t.sales_start_at || new Date(t.sales_start_at).getTime() <= nowMs) &&
    (!t.sales_end_at || new Date(t.sales_end_at).getTime() > nowMs));
  const inStock = selling.filter((t) => t.status === "active" && t.quantity > t.sold_count);
  const remaining = inStock.reduce((sum, tier) => sum + Math.max(0, tier.quantity - tier.sold_count), 0);
  const nextOpenMs = relevant
    .filter((t) => t.status === "active" && t.quantity > t.sold_count && t.sales_start_at)
    .map((t) => new Date(t.sales_start_at!).getTime())
    .filter((startMs) => Number.isFinite(startMs) && startMs > nowMs)
    .filter((startMs) => relevant.some((t) => t.status === "active" &&
      t.sales_start_at && new Date(t.sales_start_at).getTime() === startMs &&
      (!t.sales_end_at || new Date(t.sales_end_at).getTime() > startMs)))
    .reduce<number | null>((earliest, startMs) => earliest === null ? startMs : Math.min(earliest, startMs), null);

  const exhausted = selling.length > 0 &&
    selling.every((t) => t.status === "sold_out" || t.quantity <= t.sold_count);
  const status: PublicSaleStatus =
    inStock.length > 0 ? (remaining <= 10 ? "few" : "available") :
    nextOpenMs !== null ? "upcoming" :
    exhausted ? "sold_out" : "closed";

  return { status, selling, inStock, remaining, nextOpenMs };
}
