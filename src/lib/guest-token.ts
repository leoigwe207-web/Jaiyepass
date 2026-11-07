import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 256-bit unguessable secret, never sent in the checkout response body. */
export function createGuestToken(): string {
  return randomBytes(32).toString("base64url");
}
export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function isValidGuestToken(token: string, storedHash: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  const actual = Buffer.from(hashGuestToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return timingSafeEqual(actual, expected);
}
