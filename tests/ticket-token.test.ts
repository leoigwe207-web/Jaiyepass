import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { deriveQrPayload, hashPayload, verifyPayloadSignature } from "@/lib/ticket-token";

const PEPPER = "test-pepper-please-rotate";
const OTHER_PEPPER = "different-pepper";

describe("ticket token security", () => {
  it("derives a payload of <uuid>.<64-hex hmac>", () => {
    const id = randomUUID();
    const payload = deriveQrPayload(id, PEPPER);
    const [ticketId, sig] = payload.split(".");
    expect(ticketId).toBe(id);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same ticket + pepper", () => {
    const id = randomUUID();
    expect(deriveQrPayload(id, PEPPER)).toBe(deriveQrPayload(id, PEPPER));
  });

  it("verifies a genuine payload", () => {
    const payload = deriveQrPayload(randomUUID(), PEPPER);
    expect(verifyPayloadSignature(payload, PEPPER)).toBe(true);
  });

  it("rejects a payload signed with another pepper (DB leak is useless alone)", () => {
    const payload = deriveQrPayload(randomUUID(), OTHER_PEPPER);
    expect(verifyPayloadSignature(payload, PEPPER)).toBe(false);
  });

  it("rejects tampered ticket ids", () => {
    const payload = deriveQrPayload(randomUUID(), PEPPER);
    const [id, sig] = payload.split(".");
    // Swap the id but keep the signature.
    expect(verifyPayloadSignature(`${randomUUID()}.${sig}`, PEPPER)).toBe(false);
    // Truncate the id.
    expect(verifyPayloadSignature(`${id!.slice(0, 8)}.${sig}`, PEPPER)).toBe(false);
    void id;
  });

  it("rejects tampered signatures", () => {
    const payload = deriveQrPayload(randomUUID(), PEPPER);
    const [id] = payload.split(".");
    expect(verifyPayloadSignature(`${id}.deadbeef`, PEPPER)).toBe(false);
    expect(verifyPayloadSignature(`${id}.${"0".repeat(64)}`, PEPPER)).toBe(false);
  });

  it("rejects malformed payloads without throwing", () => {
    for (const bad of ["", ".", "no-dot", "a.b", "not-a-uuid.sig", "x".repeat(500)]) {
      expect(verifyPayloadSignature(bad, PEPPER)).toBe(false);
    }
  });

  it("stores only sha256(payload) — never the raw token", () => {
    const payload = deriveQrPayload(randomUUID(), PEPPER);
    const stored = hashPayload(payload);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toContain(payload.slice(0, 16));
    expect(hashPayload(payload)).toBe(stored);
    expect(hashPayload(`${payload}x`)).not.toBe(stored);
  });
});
