import { afterEach, describe, expect, it, vi } from "vitest";
import { createGuestToken, hashGuestToken, isValidGuestToken } from "@/lib/guest-token";
import { guestCheckoutEnabled } from "@/lib/env";

describe("guest order identity", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates unique URL-safe secrets with a SHA256 digest", () => {
    const a = createGuestToken();
    const b = createGuestToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(hashGuestToken(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(isValidGuestToken(a, hashGuestToken(a))).toBe(true);
  });

  it("rejects stolen or corrupted guest tokens", () => {
    const token = createGuestToken();
    expect(isValidGuestToken(createGuestToken(), hashGuestToken(token))).toBe(false);
    expect(isValidGuestToken(token, "0".repeat(64))).toBe(false);
    expect(isValidGuestToken("not-a-token", hashGuestToken(token))).toBe(false);
    expect(isValidGuestToken(token, "bad")).toBe(false);
  });

  it("does not allow guest checkout until explicit server setup", () => {
    vi.stubEnv("GUEST_CHECKOUT_ENABLED", "false");
    vi.stubEnv("RESEND_API_KEY", "test-resend");
    vi.stubEnv("TICKET_TOKEN_PEPPER", "long-test-only-pepper");
    expect(guestCheckoutEnabled()).toBe(false);
    vi.stubEnv("GUEST_CHECKOUT_ENABLED", "true");
    expect(guestCheckoutEnabled()).toBe(true);
    vi.stubEnv("RESEND_API_KEY", "");
    expect(guestCheckoutEnabled()).toBe(false);
  });
});
