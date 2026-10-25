import "server-only";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

/**
 * QR payload = "<ticket_uuid>.<hmac_sha256_hex(ticket_uuid, pepper)>"
 *
 * - The database only stores sha256(payload) as tickets.token_hash.
 * - The server can re-derive the payload for any ticket it owns (to re-render
 *   the QR) from the ticket id + TICKET_TOKEN_PEPPER.
 * - Scanners verify the HMAC first, then look up by sha256(payload), so a
 *   database leak alone cannot produce forgeable codes.
 * - No attendee personal data or payment details ever appear in the QR.
 */

export function deriveQrPayload(ticketId: string, pepper: string): string {
  const sig = createHmac("sha256", pepper).update(ticketId).digest("hex");
  return `${ticketId}.${sig}`;
}

export function hashPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

/** Constant-time verification of a scanned payload's signature. */
export function verifyPayloadSignature(payload: string, pepper: string): boolean {
  const dot = payload.indexOf(".");
  if (dot <= 0 || payload.length > 128) return false;
  const ticketId = payload.slice(0, dot);
  const sig = payload.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/.test(sig)) return false;
  if (!/^[0-9a-f-]{36}$/.test(ticketId)) return false;
  const expected = createHmac("sha256", pepper).update(ticketId).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
