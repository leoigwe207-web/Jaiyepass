import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { fromMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock, rpc: rpcMock }),
}));
vi.mock("@/lib/organization-status", () => ({ isOrganizationActive: vi.fn(async () => true) }));
vi.mock("@/lib/paystack", () => ({
  initializeTransaction: vi.fn(async () => ({ ok: true, authorizationUrl: "https://pay.example/checkout" })),
  verifyTransaction: vi.fn(async () => ({ ok: true, status: "success", amountKobo: 0, currency: "NGN" })),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ status: "sent" })),
  receiptEmail: vi.fn(() => ({ to: "a@b.com", subject: "receipt", text: "" })),
  refundEmail: vi.fn(() => ({ to: "a@b.com", subject: "refund", text: "" })),
  passwordResetEmail: vi.fn(() => ({ to: "a@b.com", subject: "reset", text: "" })),
}));

import {
  createPendingOrder,
  deliverReceipt,
  computePromoDiscount,
  verifyAndFinalizeOrder,
} from "@/lib/checkout";
import { verifyTransaction } from "@/lib/paystack";
import { receiptEmail, sendEmail } from "@/lib/email";
import { guestCheckoutEnabled } from "@/lib/env";
import { isOrganizationActive } from "@/lib/organization-status";

/** Awaitable chainable stub: supports select/eq/in/insert/update + maybeSingle. */
function chain<T extends Record<string, unknown>>(result: Partial<T> = {}) {
  const resolved = { data: null, error: null, ...result } as unknown as T;
  const p: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert", "eq", "in", "or", "ilike",
    "gte", "lte", "order", "limit", "is", "neq", "contains",
  ]) {
    p[m] = () => p;
  }
  p.maybeSingle = async () => resolved;
  p.single = async () => resolved;
  p.then = (resolve: (v: T) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(resolved).then(resolve, reject);
  return p;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.TICKET_TOKEN_PEPPER = "test-pepper";
  delete process.env.PAYSTACK_SECRET_KEY;
});

afterEach(() => {
  delete process.env.PAYSTACK_SECRET_KEY;
});

describe("createPendingOrder", () => {
  const eventId = "11111111-1111-4111-8111-111111111111";
  const ttId = "22222222-2222-4222-8222-222222222222";
  const userId = "33333333-3333-4333-8333-333333333333";

  function setupHappyPath() {
    rpcMock.mockResolvedValue({ data: "44444444-4444-4444-8444-444444444444", error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "events") return chain({ data: { id: eventId, status: "published", organization_id: "o", title: "T", is_demo: false, starts_at: new Date(Date.now() + 86_400_000).toISOString() } });
      if (table === "ticket_types") {
        return chain({
          data: [{ id: ttId, event_id: eventId, name: "Regular", price_kobo: 5000, quantity: 10, sold_count: 0, per_order_limit: 4, status: "active", sales_start_at: null, sales_end_at: null }],
        });
      }
      if (table === "orders") return chain({ data: { id: "55555555-5555-4555-8555-555555555555", created_at: "now" } });
      return chain();
    });
  }

  it("rejects unpublished events with 404", async () => {
    fromMock.mockImplementation((table: string) =>
      table === "events" ? chain({ data: { id: eventId, status: "draft" } }) : chain(),
    );
    const res = await createPendingOrder({ userId, eventId, items: [{ ticketTypeId: ttId, quantity: 1 }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("blocks demo listings even if their database status is published", async () => {
    fromMock.mockImplementation((table: string) =>
      table === "events" ? chain({ data: {
        id: eventId, status: "published", is_demo: true,
        starts_at: new Date(Date.now() + 86_400_000).toISOString(),
      } }) : chain(),
    );
    const res = await createPendingOrder({ userId, eventId, items: [{ ticketTypeId: ttId, quantity: 1 }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("blocks tickets once an event has started", async () => {
    fromMock.mockImplementation((table: string) =>
      table === "events" ? chain({ data: {
        id: eventId, status: "published", is_demo: false,
        starts_at: new Date(Date.now() - 3_600_000).toISOString(),
      } }) : chain(),
    );
    const res = await createPendingOrder({ userId, eventId, items: [{ ticketTypeId: ttId, quantity: 1 }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects invalid quantities before touching the database", async () => {
    const res = await createPendingOrder({ userId, eventId, items: [{ ticketTypeId: ttId, quantity: 0 }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns 409 with a friendly message when inventory runs out", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "events") return chain({ data: { id: eventId, status: "published", is_demo: false, starts_at: new Date(Date.now() + 86_400_000).toISOString() } });
      if (table === "ticket_types") {
        return chain({
          data: [{ id: ttId, event_id: eventId, name: "Regular", price_kobo: 5000, quantity: 10, sold_count: 0, per_order_limit: 4, status: "active", sales_start_at: null, sales_end_at: null }],
        });
      }
      return chain();
    });
    rpcMock.mockResolvedValue({ data: null, error: { message: "not enough tickets available" } });

    const res = await createPendingOrder({ userId, eventId, items: [{ ticketTypeId: ttId, quantity: 5 }] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(409);
      expect(res.error).toContain("Regular");
    }
  });

  it("refuses guest creation unless server feature flag is enabled", async () => {
    vi.stubEnv("GUEST_CHECKOUT_ENABLED", "false");
    const res = await createPendingOrder({
      userId: null, guestName: "Ada Okafor", guestEmail: "ada@example.com",
      guestTokenHash: "a".repeat(64), eventId, items: [{ ticketTypeId: ttId, quantity: 1 }],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(403);
    expect(fromMock).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("creates a guest order with name/email/hash, never a fake auth ID", async () => {
    vi.stubEnv("GUEST_CHECKOUT_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "resend-test");
    vi.stubEnv("TICKET_TOKEN_PEPPER", "pepper-test");
    expect(guestCheckoutEnabled()).toBe(true);
    setupHappyPath();
    const original = fromMock.getMockImplementation();
    let insertBody: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table === "orders") {
        const c = chain({ data: { id: "55555555-5555-4555-8555-555555555555", created_at: "now" } });
        c.insert = ((row: Record<string, unknown>) => { insertBody = row; return c; }) as typeof c.insert;
        return c;
      }
      return original ? original(table) : chain();
    });
    const res = await createPendingOrder({
      userId: null, guestName: "Ada Okafor", guestEmail: "ada@example.com",
      guestTokenHash: "a".repeat(64), eventId, items: [{ ticketTypeId: ttId, quantity: 1 }],
    });
    if (!res.ok) throw new Error(`Guest creation failed: ${res.error} (HTTP ${res.status})`);
    expect(res.ok).toBe(true);
    expect(insertBody).toMatchObject({
      user_id: null, guest_name: "Ada Okafor",
      guest_email: "ada@example.com", guest_token_hash: "a".repeat(64),
    });
    vi.unstubAllEnvs();
  });

  it("blocks a paused organizer even when the event remains published", async () => {
    setupHappyPath();
    vi.mocked(isOrganizationActive).mockResolvedValueOnce(false);
    const res = await createPendingOrder({ userId, eventId, items: [{ ticketTypeId: ttId, quantity: 1 }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("creates order + items with server-computed totals on success", async () => {
    setupHappyPath();
    const res = await createPendingOrder({ userId, eventId, items: [{ ticketTypeId: ttId, quantity: 2 }] });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.totalKobo).toBe(10_000 + Math.round(10_000 * 0.025)); // subtotal + fee

    const insertTables = fromMock.mock.calls.map((c) => c[0]);
    expect(insertTables).toContain("orders");
    expect(insertTables).toContain("order_items");
    expect(rpcMock).toHaveBeenCalledWith("create_inventory_hold", {
      p_ticket_type_id: ttId,
      p_quantity: 2,
      p_minutes: 10,
    });
  });

  it("rejects ticket types that belong to another event", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "events") return chain({ data: { id: eventId, status: "published", is_demo: false, starts_at: new Date(Date.now() + 86_400_000).toISOString() } });
      if (table === "ticket_types") {
        return chain({
          data: [{ id: ttId, event_id: "99999999-9999-4999-8999-999999999999", name: "R", price_kobo: 1, quantity: 5, sold_count: 0, per_order_limit: 4, status: "active", sales_start_at: null, sales_end_at: null }],
        });
      }
      return chain();
    });
    const res = await createPendingOrder({ userId, eventId, items: [{ ticketTypeId: ttId, quantity: 1 }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("computePromoDiscount", () => {
  const base = { eventId: "ee", organizationId: "oo", subtotalKobo: 100_000 };

  function promoRow(overrides: Record<string, unknown> = {}) {
    return chain({
      data: {
        id: "p1",
        code: "CREW10",
        kind: "percentage",
        value: 10,
        max_redemptions: null,
        redemptions_used: 0,
        starts_at: null,
        ends_at: null,
        is_active: true,
        event_id: null,
        ...overrides,
      },
    });
  }

  it("computes percentage discounts server-side", async () => {
    fromMock.mockReturnValue(promoRow());
    const r = await computePromoDiscount({ ...base, code: "crew10" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.discountKobo).toBe(10_000);
  });

  it("computes fixed discounts, clamped to the subtotal", async () => {
    fromMock.mockReturnValue(promoRow({ kind: "fixed", value: 500_000 }));
    const r = await computePromoDiscount({ ...base, code: "BIG5K" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.discountKobo).toBe(100_000);
  });

  it("rejects inactive and expired codes", async () => {
    fromMock.mockReturnValue(promoRow({ is_active: false }));
    const inactive = await computePromoDiscount({ ...base, code: "X" });
    expect(inactive.ok).toBe(false);

    fromMock.mockReturnValue(promoRow({ ends_at: new Date(Date.now() - 86_400_000).toISOString() }));
    const expired = await computePromoDiscount({ ...base, code: "EXP1" });
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.error).toContain("expired");
  });

  it("rejects exhausted redemptions and codes from other events", async () => {
    fromMock.mockReturnValue(promoRow({ max_redemptions: 5, redemptions_used: 5 }));
    const exhausted = await computePromoDiscount({ ...base, code: "MAX5" });
    expect(exhausted.ok).toBe(false);
    if (!exhausted.ok) expect(exhausted.error).toContain("fully redeemed");

    fromMock.mockReturnValue(promoRow({ event_id: "another-event" }));
    const wrongEvent = await computePromoDiscount({ ...base, code: "OTHER1" });
    expect(wrongEvent.ok).toBe(false);
    if (!wrongEvent.ok) expect(wrongEvent.error).toContain("this event");
  });

  it("validates code format before querying", async () => {
    fromMock.mockReturnValue(promoRow());
    const r = await computePromoDiscount({ ...base, code: "bad code!" });
    expect(r.ok).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("verifyAndFinalizeOrder", () => {
  const orderId = "66666666-6666-4666-8666-666666666666";
  const reference = "jp_abc123";

  function orderRow(overrides: Record<string, unknown> = {}) {
    return chain({
      data: {
        id: orderId,
        status: "awaiting_payment",
        total_kobo: 10_250,
        currency: "NGN",
        paystack_reference: reference,
        status_history: [],
        ...overrides,
      },
    });
  }

  it("never finalizes in test mode (no provider key)", async () => {
    fromMock.mockReturnValue(orderRow());
    const r = await verifyAndFinalizeOrder(orderId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("test-mode");
    expect(rpcMock).not.toHaveBeenCalled();
    expect(verifyTransaction).not.toHaveBeenCalled();
  });

  it("short-circuits an already-paid order without contacting Paystack", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    fromMock.mockReturnValue(orderRow({ status: "paid" }));
    const r = await verifyAndFinalizeOrder(orderId);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.status).toBe("already_finalized");
    expect(verifyTransaction).not.toHaveBeenCalled();
  });

  it("refuses to finalize when the verified amount does not match", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    fromMock.mockReturnValue(orderRow());
    vi.mocked(verifyTransaction).mockResolvedValueOnce({
      ok: true,
      status: "success",
      amountKobo: 1, // tampered/small payment
      currency: "NGN",
      reference,
    });

    const r = await verifyAndFinalizeOrder(orderId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("amount");
    expect(rpcMock).not.toHaveBeenCalled(); // never issues tickets
  });

  it("rejects a webhook for a different Paystack reference", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    fromMock.mockReturnValue(orderRow());
    const r = await verifyAndFinalizeOrder(orderId, "jp_different");
    expect(r.ok).toBe(false);
    expect(verifyTransaction).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects an unexpected reference returned by the provider", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    fromMock.mockReturnValue(orderRow());
    vi.mocked(verifyTransaction).mockResolvedValueOnce({
      ok: true, status: "success", amountKobo: 10_250, currency: "NGN", reference: "jp_other",
    });
    const r = await verifyAndFinalizeOrder(orderId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("reference");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("never finalizes cancelled or expired orders", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    fromMock.mockReturnValue(orderRow({status:"expired"}));
    const r = await verifyAndFinalizeOrder(orderId);
    expect(r.ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("refuses to finalize on currency mismatch", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    fromMock.mockReturnValue(orderRow());
    vi.mocked(verifyTransaction).mockResolvedValueOnce({
      ok: true,
      status: "success",
      amountKobo: 10_250,
      currency: "USD",
      reference,
    });
    const r = await verifyAndFinalizeOrder(orderId);
    expect(r.ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("finalizes idempotently when verification passes", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    fromMock.mockImplementation((table: string) => {
      if (table === "orders") return orderRow();
      if (table === "inventory_holds") return chain({
        data: [{ id: "hold-1", status: "active", expires_at: new Date(Date.now() + 600_000).toISOString() }],
      });
      return chain();
    });
    rpcMock.mockResolvedValue({ data: { status: "paid", tickets_issued: 2 }, error: null });
    vi.mocked(verifyTransaction).mockResolvedValueOnce({
      ok: true,
      status: "success",
      amountKobo: 10_250,
      currency: "NGN",
      reference,
      channel: "card",
    });

    const r = await verifyAndFinalizeOrder(orderId);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.status).toBe("paid");
    expect(rpcMock).toHaveBeenCalledWith("finalize_paid_order", {
      p_order_id: orderId,
      p_reference: reference,
      p_channel: "card",
      p_pepper: "test-pepper",
    });
  });

  it("marks the order failed when Paystack reports a failed charge", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test";
    fromMock.mockReturnValue(orderRow());
    vi.mocked(verifyTransaction).mockResolvedValueOnce({ ok: true, status: "failed", reference });

    const r = await verifyAndFinalizeOrder(orderId);
    expect(r.ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("orders");
  });
});

describe("guest QR ticket email delivery", () => {
  it("uses the guest booking email without manufacturing a registered profile", async () => {
    vi.stubEnv("GUEST_CHECKOUT_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "resend-test");
    vi.stubEnv("TICKET_TOKEN_PEPPER", "test-ticket-pepper");
    const orderId = "55555555-5555-4555-8555-555555555555";
    const ticketId = "66666666-6666-4666-8666-666666666666";
    fromMock.mockImplementation((table: string) => {
      if (table === "orders") return chain({
        data: {
          id: orderId, status: "paid", user_id: null,
          total_kobo: 10000, paystack_reference: "jp_guest_test",
          guest_name: "Ada Okafor", guest_email: "ada@example.com",
          profile: null,
          event: { title: "Live Music Night", starts_at: "2026-12-10T19:00:00Z" },
          tickets: [{ id: ticketId, status: "issued" }],
        },
      });
      return chain();
    });
    rpcMock.mockResolvedValue({ data: true, error: null });
    await deliverReceipt(orderId);
    expect(receiptEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "ada@example.com", name: "Ada Okafor", quantity: 1,
      qrAttachments: [expect.objectContaining({
        filename: "JaiyePass-ticket-1.png", content_type: "image/png",
      })],
    }));
    expect(sendEmail).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });
});
