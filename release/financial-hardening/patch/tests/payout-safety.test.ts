import { describe, expect, it } from "vitest";
import { canManuallyChangePayout, safeAmountKobo } from "../src/lib/payout-safety";

describe("manual payout safety", () => {
  it("permits review while rejecting a manual paid status", () => {
    expect(canManuallyChangePayout("pending", "approved")).toBe(true);
    expect(canManuallyChangePayout("pending", "paid")).toBe(false);
    expect(canManuallyChangePayout("approved", "processing")).toBe(false);
    expect(canManuallyChangePayout("processing", "paid")).toBe(false);
  });
  it("rejects illegal, repeated and terminal transitions", () => {
    expect(canManuallyChangePayout("paid", "approved")).toBe(false);
    expect(canManuallyChangePayout("cancelled", "pending")).toBe(false);
    expect(canManuallyChangePayout("approved", "approved")).toBe(false);
  });
  it("refuses fractional, negative, infinite and nonnumeric money", () => {
    for (const value of [-1, 1.2, Infinity, NaN, "100", null]) {
      expect(safeAmountKobo(value)).toBe(0);
    }
    expect(safeAmountKobo(1250)).toBe(1250);
  });
});
