import { describe, it, expect } from "vitest";
import {
  signupSchema,
  checkoutRequestSchema,
  promoValidateSchema,
  scanSchema,
  eventInputSchema,
  ticketTypeInputSchema,
  promoInputSchema,
  reportSchema,
  contactSchema,
  sanitizeText,
} from "@/lib/validation";

const uuid = "3f1d2a4c-9b7e-4d21-8a65-1c0e5b9f7a11";

const signup = { email: "a@b.com", password: "Sup3rSecret99", fullName: "Ada Obi" };

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(signup).success).toBe(true);
  });
  it("rejects bad emails, short and weak passwords, missing names", () => {
    expect(signupSchema.safeParse({ ...signup, email: "nope" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...signup, password: "short1" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...signup, password: "alllettersonly" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...signup, password: "1234567890" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...signup, fullName: "" }).success).toBe(false);
  });
});

describe("checkoutRequestSchema", () => {
  it("accepts valid items", () => {
    const r = checkoutRequestSchema.safeParse({
      eventId: uuid,
      items: [{ ticketTypeId: uuid, quantity: 2 }],
    });
    expect(r.success).toBe(true);
  });
  it("rejects zero/negative/over-limit quantities", () => {
    for (const quantity of [0, -1, 21]) {
      const r = checkoutRequestSchema.safeParse({ eventId: uuid, items: [{ ticketTypeId: uuid, quantity }] });
      expect(r.success).toBe(false);
    }
  });
  it("rejects non-uuid ids", () => {
    expect(
      checkoutRequestSchema.safeParse({ eventId: "drop table", items: [{ ticketTypeId: uuid, quantity: 1 }] }).success,
    ).toBe(false);
  });
});

describe("promoValidateSchema", () => {
  it("accepts a promo code", () => {
    expect(promoValidateSchema.safeParse({ eventId: uuid, code: "CREW10" }).success).toBe(true);
  });
  it("rejects empty codes", () => {
    expect(promoValidateSchema.safeParse({ eventId: uuid, code: "" }).success).toBe(false);
  });
});

describe("scanSchema", () => {
  it("accepts a QR payload", () => {
    const payload = `${uuid}.${"a".repeat(64)}`;
    expect(scanSchema.safeParse({ payload, eventId: uuid }).success).toBe(true);
  });
  it("rejects oversized payloads", () => {
    expect(scanSchema.safeParse({ payload: "x".repeat(500), eventId: uuid }).success).toBe(false);
  });
});

describe("eventInputSchema", () => {
  const valid = {
    title: "Lagos Rooftop Sessions",
    description: "An evening of live afrobeats with a skyline view.",
    cityId: uuid,
    venueName: "The Terrace",
    venueAddress: "12 Ozumba Mbadiwe Ave, Lagos",
    startsAt: "2026-12-12T19:00:00.000Z",
    endsAt: "2026-12-12T23:00:00.000Z",
  };
  it("accepts a valid event", () => {
    expect(eventInputSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects short titles and long descriptions", () => {
    expect(eventInputSchema.safeParse({ ...valid, title: "Hi" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...valid, description: "x".repeat(8001) }).success).toBe(false);
  });
  it("rejects missing venue or city", () => {
    expect(eventInputSchema.safeParse({ ...valid, venueName: "" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...valid, cityId: "nope" }).success).toBe(false);
  });
});

describe("ticketTypeInputSchema", () => {
  const valid = { name: "Early bird", priceKobo: 500_000, quantity: 100, perOrderLimit: 4 };
  it("accepts a valid ticket type", () => {
    expect(ticketTypeInputSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects free negative prices, zero quantity and absurd per-order limits", () => {
    expect(ticketTypeInputSchema.safeParse({ ...valid, priceKobo: -1 }).success).toBe(false);
    expect(ticketTypeInputSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    expect(ticketTypeInputSchema.safeParse({ ...valid, perOrderLimit: 1000 }).success).toBe(false);
  });
});

describe("promoInputSchema", () => {
  it("accepts percentage and fixed promos", () => {
    expect(promoInputSchema.safeParse({ code: "CREW10", kind: "percentage", value: 10 }).success).toBe(true);
    expect(promoInputSchema.safeParse({ code: "TEN_OFF", kind: "fixed", value: 100_000 }).success).toBe(true);
  });
  it("rejects codes with spaces/symbols", () => {
    expect(promoInputSchema.safeParse({ code: "BAD CODE!", kind: "percentage", value: 10 }).success).toBe(false);
  });
  it("rejects non-positive values", () => {
    expect(promoInputSchema.safeParse({ code: "X1", kind: "fixed", value: 0 }).success).toBe(false);
  });
});

describe("reportSchema & contactSchema", () => {
  it("accepts a valid report", () => {
    const r = reportSchema.safeParse({ eventId: uuid, reason: "Misleading description", details: "Wrong date" });
    expect(r.success).toBe(true);
  });
  it("rejects reports with no reason", () => {
    expect(reportSchema.safeParse({ eventId: uuid, reason: "" }).success).toBe(false);
  });
  it("accepts a valid contact message", () => {
    const r = contactSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      subject: "Question about my order",
      message: "I bought two tickets but only see one.",
    });
    expect(r.success).toBe(true);
  });
  it("rejects short messages and bad emails", () => {
    expect(contactSchema.safeParse({ name: "A", email: "a@b.com", subject: "Hi", message: "too short" }).success).toBe(false);
    expect(
      contactSchema.safeParse({ name: "Ada", email: "nope", subject: "Hi", message: "long enough message" }).success,
    ).toBe(false);
  });
});

describe("sanitizeText", () => {
  it("strips angle brackets used for HTML injection", () => {
    expect(sanitizeText('<script>alert("x")</script>')).toBe('scriptalert("x")/script');
  });
  it("strips control characters and trims", () => {
    expect(sanitizeText("  hello\u0000\nworld\u001f  ")).toBe("hello  world");
  });
  it("keeps ordinary unicode text intact", () => {
    expect(sanitizeText("Lagos Rooftop 2026 · ₦5,000")).toBe("Lagos Rooftop 2026 · ₦5,000");
  });
});
