import { describe, expect, it } from "vitest";
import { createGuestToken, hashGuestToken, isValidGuestToken } from "../src/lib/guest-token";

describe("guest checkout cookie tokens", () => {
  it("generates an unpredictable 256-bit URL-safe credential", () => {
    const token = createGuestToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createGuestToken()).not.toBe(token);
  });
  it("uses SHA-256 and rejects a different credential", () => {
    const token = createGuestToken();
    const digest = hashGuestToken(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(isValidGuestToken(token, digest)).toBe(true);
    expect(isValidGuestToken(createGuestToken(), digest)).toBe(false);
    expect(isValidGuestToken(token, "invalid")).toBe(false);
  });
});
