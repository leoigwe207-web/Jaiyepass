// All money in this codebase is an integer number of kobo (NGN minor units).
// Never use floats for money.

export type Kobo = number;

export const CURRENCY = "NGN" as const;

export function formatKobo(kobo: Kobo, opts: { hideZeroDecimals?: boolean } = {}): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: opts.hideZeroDecimals || kobo % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(naira);
}

/** Convert a user-entered naira amount (may include decimals) to kobo. */
export function nairaToKobo(input: string | number): Kobo {
  const value = typeof input === "string" ? Number(input.replace(/[^\d.]/g, "")) : input;
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

/**
 * Platform fee: 2.5% capped at ₦2,000 (200000 kobo), charged to the buyer,
 * configurable via env for tests. Zero on free tickets.
 */
export const FEE_RATE = 0.025;
export const FEE_CAP_KOBO = 200_000;

export function computeFee(subtotalKobo: Kobo, feeRate = FEE_RATE, feeCap = FEE_CAP_KOBO): Kobo {
  if (subtotalKobo <= 0) return 0;
  return Math.min(Math.round(subtotalKobo * feeRate), feeCap);
}

export function percentOff(subtotalKobo: Kobo, percent: number): Kobo {
  if (percent <= 0 || percent > 100) return 0;
  return Math.min(subtotalKobo, Math.round((subtotalKobo * percent) / 100));
}

export function orderTotals(subtotalKobo: Kobo, discountKobo: Kobo) {
  const discount = Math.min(discountKobo, subtotalKobo);
  const afterDiscount = subtotalKobo - discount;
  const fee = computeFee(afterDiscount);
  return {
    subtotalKobo,
    discountKobo: discount,
    feeKobo: fee,
    totalKobo: afterDiscount + fee,
  };
}

/** Assert a client-submitted amount matches the trusted server amount. */
export function amountsEqual(a: number, b: number): boolean {
  return Number.isInteger(a) && Number.isInteger(b) && a === b;
}
