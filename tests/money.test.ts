import { describe, it, expect } from "vitest";
import {
  formatKobo,
  nairaToKobo,
  computeFee,
  percentOff,
  orderTotals,
  amountsEqual,
  FEE_RATE,
  FEE_CAP_KOBO,
} from "@/lib/money";

describe("formatKobo", () => {
  it("formats whole naira without decimals when asked", () => {
    expect(formatKobo(500_000, { hideZeroDecimals: true })).toContain("5,000");
    expect(formatKobo(500_000, { hideZeroDecimals: true })).not.toContain(".");
  });

  it("keeps kobo precision for non-whole naira", () => {
    expect(formatKobo(1_505)).toContain("15.05");
    expect(formatKobo(1_500)).toContain("15"); // whole naira, no decimals needed
  });

  it("always labels the currency as NGN naira", () => {
    expect(formatKobo(100)).toMatch(/₦|NGN/);
  });
});

describe("nairaToKobo", () => {
  it("parses plain integers", () => {
    expect(nairaToKobo("5000")).toBe(500_000);
  });

  it("parses decimals without float drift", () => {
    expect(nairaToKobo("0.07")).toBe(7);
    expect(nairaToKobo("1999.99")).toBe(199_999);
  });

  it("strips currency symbols and commas", () => {
    expect(nairaToKobo("₦12,500")).toBe(1_250_000);
  });

  it("returns 0 for garbage", () => {
    expect(nairaToKobo("abc")).toBe(0);
    expect(nairaToKobo(-5)).toBe(0);
  });
});

describe("computeFee", () => {
  it("charges 2.5% on the discounted amount", () => {
    expect(computeFee(100_000)).toBe(2_500);
    expect(computeFee(100_000)).toBe(Math.round(100_000 * FEE_RATE));
  });

  it("caps the fee at ₦2,000", () => {
    expect(computeFee(10_000_000)).toBe(FEE_CAP_KOBO);
  });

  it("never charges a fee on free tickets", () => {
    expect(computeFee(0)).toBe(0);
  });

  it("rounds to whole kobo", () => {
    expect(Number.isInteger(computeFee(333))).toBe(true);
  });
});

describe("percentOff", () => {
  it("computes percentage discounts", () => {
    expect(percentOff(100_000, 10)).toBe(10_000);
    expect(percentOff(999, 25)).toBe(250); // rounded
  });

  it("refuses out-of-range percentages", () => {
    expect(percentOff(100_000, 0)).toBe(0);
    expect(percentOff(100_000, 101)).toBe(0);
    expect(percentOff(100_000, -10)).toBe(0);
  });

  it("never discounts more than the subtotal", () => {
    expect(percentOff(500, 100)).toBe(500);
  });
});

describe("orderTotals", () => {
  it("applies discount before fee", () => {
    const t = orderTotals(100_000, 20_000);
    expect(t.discountKobo).toBe(20_000);
    expect(t.feeKobo).toBe(Math.round(80_000 * FEE_RATE));
    expect(t.totalKobo).toBe(80_000 + t.feeKobo);
  });

  it("clamps discounts to the subtotal", () => {
    const t = orderTotals(1_000, 999_999);
    expect(t.discountKobo).toBe(1_000);
    expect(t.totalKobo).toBe(0); // 100% off, no fee on zero
  });

  it("produces exact integer arithmetic", () => {
    const t = orderTotals(33_333, 1_111);
    expect(Number.isInteger(t.totalKobo)).toBe(true);
    expect(t.totalKobo).toBe(33_333 - 1_111 + t.feeKobo);
  });
});

describe("amountsEqual", () => {
  it("accepts identical integers only", () => {
    expect(amountsEqual(100, 100)).toBe(true);
    expect(amountsEqual(100, 101)).toBe(false);
    expect(amountsEqual(100.5, 100.5)).toBe(false); // floats never trusted
    expect(amountsEqual(NaN, NaN)).toBe(false);
  });
});
