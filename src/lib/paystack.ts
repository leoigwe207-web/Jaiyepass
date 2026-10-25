import "server-only";
import { serverEnv } from "./env";

/**
 * Paystack REST adapter. All calls happen server-side; the secret key never
 * reaches the browser. Every call site must handle `ok: false` — we never
 * claim a payment succeeded without a provider confirmation.
 */

const PAYSTACK_BASE = "https://api.paystack.co";

export interface InitializeParams {
  reference: string;
  email: string;
  amountKobo: number;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeResult {
  ok: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  error?: string;
}

async function paystackFetch(path: string, init: RequestInit) {
  const { paystackSecret } = serverEnv();
  if (!paystackSecret) throw new Error("PAYSTACK_SECRET_KEY not configured");
  return fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}

export async function initializeTransaction(params: InitializeParams): Promise<InitializeResult> {
  try {
    const res = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        reference: params.reference,
        email: params.email,
        amount: params.amountKobo,
        currency: "NGN",
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.status) {
      return { ok: false, error: json?.message ?? `Paystack error ${res.status}` };
    }
    return {
      ok: true,
      authorizationUrl: json.data.authorization_url,
      accessCode: json.data.access_code,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Paystack unreachable" };
  }
}

export interface VerifyResult {
  ok: boolean;
  status?: "success" | "failed" | "abandoned" | "reversed" | "pending";
  amountKobo?: number;
  currency?: string;
  reference?: string;
  channel?: string;
  raw?: Record<string, unknown>;
  error?: string;
}

/** Server-side verification of a transaction by reference. */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  try {
    const res = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.status) {
      return { ok: false, error: json?.message ?? `Paystack error ${res.status}` };
    }
    const d = json.data;
    return {
      ok: true,
      status: d.status,
      amountKobo: d.amount,
      currency: d.currency,
      reference: d.reference,
      channel: d.channel,
      raw: d,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Paystack unreachable" };
  }
}

/**
 * Initiate a refund (full or partial) against a verified transaction.
 * Returns the Paystack refund id so we can reconcile `refund.processed`
 * webhooks against our refunds row (stored as provider_reference).
 */
export async function createRefund(opts: {
  transactionReference: string;
  amountKobo?: number;
}): Promise<{ ok: boolean; refundId?: string; error?: string }> {
  try {
    const res = await paystackFetch("/refund", {
      method: "POST",
      body: JSON.stringify({
        transaction: opts.transactionReference,
        ...(opts.amountKobo ? { amount: opts.amountKobo } : {}),
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.status) {
      return { ok: false, error: json?.message ?? `Paystack error ${res.status}` };
    }
    return { ok: true, refundId: json.data?.id != null ? String(json.data.id) : undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Paystack unreachable" };
  }
}

/**
 * Validate the x-paystack-signature header: HMAC-SHA512 of the raw body with
 * PAYSTACK_WEBHOOK_SECRET. Raw body bytes are required, so the webhook route
 * must read `await req.text()` before parsing JSON.
 */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const { paystackWebhookSecret } = serverEnv();
  if (!paystackWebhookSecret) return false;
  // Node-only (route handlers run on the server).
  const { createHmac, timingSafeEqual } = require("node:crypto") as typeof import("node:crypto");
  const expected = createHmac("sha512", paystackWebhookSecret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
