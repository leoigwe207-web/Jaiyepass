import { describe, expect, it } from "vitest";
import { formatLagosTicketDateTime, lagosLocalToUtcIso } from "@/lib/ticket-sales-time";

describe("organizer ticket sales times (Africa/Lagos)", () => {
  it("saves 6 November 23:21 Lagos as 6 November 22:21 UTC", () => {
    expect(lagosLocalToUtcIso("2026-11-06T23:21")).toBe("2026-11-06T22:21:00.000Z");
  });
  it("round-trips the expected Nigerian calendar date", () => {
    expect(formatLagosTicketDateTime("2026-11-06T22:21:00.000Z")).toMatch(/Fri.*6 Nov.*23:21.*WAT/);
  });
  it("handles midnight crossing without moving the calendar date", () => {
    expect(lagosLocalToUtcIso("2026-11-07T00:21")).toBe("2026-11-06T23:21:00.000Z");
    expect(formatLagosTicketDateTime("2026-11-06T23:21:00.000Z")).toMatch(/Sat.*7 Nov.*00:21.*WAT/);
  });
  it("rejects nonexistent or out-of-range dates", () => {
    expect(lagosLocalToUtcIso("2026-02-30T10:00")).toBeNull();
    expect(lagosLocalToUtcIso("2026-11-06T25:00")).toBeNull();
    expect(lagosLocalToUtcIso("not-a-date")).toBeNull();
  });
  it("accepts blank only when handled as an optional field", () => {
    expect(lagosLocalToUtcIso("")).toBeNull();
  });
});
