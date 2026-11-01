import { describe, it, expect, vi, beforeEach } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock, rpc: vi.fn() }),
}));
vi.mock("@/lib/paystack", () => ({
  isValidWebhookSignature: vi.fn(() => true),
}));
vi.mock("@/lib/checkout", () => ({
  verifyAndFinalizeOrder: vi.fn(async () => ({ ok: true, orderId: "o", status: "paid" })),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ status: "sent" })),
  refundEmail: vi.fn(() => ({ to: "a@b.com", subject: "refund", text: "" })),
  receiptEmail: vi.fn(() => ({ to: "a@b.com", subject: "receipt", text: "" })),
  passwordResetEmail: vi.fn(() => ({ to: "a@b.com", subject: "reset", text: "" })),
}));

import { POST } from "@/app/api/paystack/webhook/route";
import { isValidWebhookSignature } from "@/lib/paystack";
import { verifyAndFinalizeOrder } from "@/lib/checkout";

function chain(result: Record<string, unknown> = {}) {
  const resolved = { data: null, error: null, ...result };
  const p: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "in", "order", "limit"]) p[m] = () => p;
  p.maybeSingle = async () => resolved;
  p.then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
    Promise.resolve(resolved).then(res, rej);
  return p;
}

function chargeBody() {
  return JSON.stringify({
    id: "evt_1",
    event: "charge.success",
    data: { reference: "jp_abc", amount: 5000, currency: "NGN", metadata: { orderId: "order-1" } },
  });
}

async function post(body: string) {
  return POST(
    new Request("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": "sig" },
      body,
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PAYSTACK_WEBHOOK_SECRET = "whsec";
  vi.mocked(isValidWebhookSignature).mockReturnValue(true);
});

describe("Paystack webhook", () => {
  it("rejects invalid signatures with 401 before any processing", async () => {
    vi.mocked(isValidWebhookSignature).mockReturnValue(false);
    const res = await post(chargeBody());
    expect(res.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
    expect(verifyAndFinalizeOrder).not.toHaveBeenCalled();
  });

  it("verifies + finalizes a charge.success event", async () => {
    fromMock.mockReturnValue(chain());
    const res = await post(chargeBody());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("paid");
    expect(verifyAndFinalizeOrder).toHaveBeenCalledWith("order-1");

    // Idempotency row recorded with provider columns.
    expect(fromMock).toHaveBeenCalledWith("webhook_events");
  });

  it("acknowledges duplicate deliveries without reprocessing", async () => {
    // First lookup is INSERT (unique violation), second is SELECT of the
    // existing successfully processed event. It must not be finalized again.
    fromMock
      .mockReturnValueOnce(chain({ error: { code: "23505" } }))
      .mockReturnValueOnce(chain({ data: { processed: true } }));
    const res = await post(chargeBody());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(verifyAndFinalizeOrder).not.toHaveBeenCalled();
  });

  it("retries a duplicate event that was not processed successfully", async () => {
    fromMock
      .mockReturnValueOnce(chain({ error: { code: "23505" } }))
      .mockReturnValueOnce(chain({ data: { processed: false } }))
      .mockReturnValue(chain());
    const res = await post(chargeBody());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("paid");
    expect(verifyAndFinalizeOrder).toHaveBeenCalledWith("order-1");
  });

  it("returns 400 when reference/order metadata is missing", async () => {
    fromMock.mockReturnValue(chain());
    const res = await post(
      JSON.stringify({ id: "evt_2", event: "charge.success", data: { reference: null } }),
    );
    expect(res.status).toBe(400);
    expect(verifyAndFinalizeOrder).not.toHaveBeenCalled();
  });

  it("acknowledges unknown event types so Paystack stops retrying", async () => {
    fromMock.mockReturnValue(chain());
    const res = await post(JSON.stringify({ id: "evt_3", event: "some.unknown", data: {} }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ignored).toBe("some.unknown");
  });
});
