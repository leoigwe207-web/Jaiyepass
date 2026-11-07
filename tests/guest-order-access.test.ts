import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGuestToken, hashGuestToken } from "@/lib/guest-token";

const mock = vi.hoisted(() => ({
  session: vi.fn(),
  cookie: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mock.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mock.cookie }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mock.from }),
}));

import { getOrderAccess, guestCookieName } from "@/lib/guest-checkout";

const orderId = "7a35f29e-8a95-49d8-a4ed-62785ef20eaa";
function setupOrder(order: Record<string, unknown> | null) {
  const selection = vi.fn().mockReturnValue({
    eq: () => ({ maybeSingle: async () => ({ data: order, error: null }) }),
  });
  mock.from.mockReturnValue({ select: selection });
  return selection;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TICKET_TOKEN_PEPPER", "test-pepper-with-enough-length");
  vi.stubEnv("RESEND_API_KEY", "resend-test-not-real");
  vi.stubEnv("GUEST_CHECKOUT_ENABLED", "true");
  mock.session.mockResolvedValue(null);
  mock.cookie.mockReturnValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("guest order access", () => {
  it("rejects malformed order IDs before touching privileged records", async () => {
    expect(await getOrderAccess("not-a-uuid")).toBeNull();
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("rejects anyone without the correct HttpOnly order cookie", async () => {
    const token = createGuestToken();
    setupOrder({ id: orderId, user_id: null, guest_email: "buyer@example.com", guest_token_hash: hashGuestToken(token) });
    mock.cookie.mockReturnValue({ value: createGuestToken() });
    expect(await getOrderAccess(orderId)).toBeNull();
    expect(mock.cookie).toHaveBeenCalledWith(guestCookieName(orderId));
  });

  it("authorizes the original guest browser but never exposes the token hash", async () => {
    const token = createGuestToken();
    setupOrder({ id: orderId, user_id: null, guest_email: "buyer@example.com", guest_token_hash: hashGuestToken(token) });
    mock.cookie.mockReturnValue({ value: token });
    expect(await getOrderAccess(orderId)).toEqual({
      userId: null, guestEmail: "buyer@example.com", guestToken: token,
    });
  });

  it("keeps registered orders scoped to the authenticated owner", async () => {
    const owner = "50bb3ebc-30b8-49e2-a39b-5f5755cd5bed";
    const select = setupOrder({ id: orderId, user_id: owner });
    mock.session.mockResolvedValue({ id: owner, email: "owner@example.com" });
    expect(await getOrderAccess(orderId)).toEqual({ userId: owner, guestEmail: null, guestToken: null });
    mock.session.mockResolvedValue({ id: "another-user" });
    expect(await getOrderAccess(orderId)).toBeNull();
    vi.stubEnv("GUEST_CHECKOUT_ENABLED", "false");
    await getOrderAccess(orderId);
    expect(select).toHaveBeenLastCalledWith("id,user_id");
  });
});
