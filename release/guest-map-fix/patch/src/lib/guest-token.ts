import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export function createGuestToken() { return randomBytes(32).toString("base64url"); }
export function hashGuestToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function isValidGuestToken(token: string, digest: string): boolean {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token) || !/^[a-f0-9]{64}$/.test(digest)) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = Buffer.from(hashGuestToken(token), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
