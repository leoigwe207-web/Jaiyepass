// Server-only environment access. Import this ONLY from server code.

export function isTestMode(): boolean {
  return process.env.NODE_ENV !== "production" && !paidCheckoutConfigured();
}

/** Prevent a misconfigured Preview secret from showing a payment button.
 * Paystack itself independently enforces the same check server-side.
 */
export function paidCheckoutConfigured(): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  return Boolean(secret) && paystackKeyAllowed(secret, process.env.VERCEL_ENV);
}

export function serverEnv() {
  const missing: string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY ?? "";
  // Paystack signs webhooks with the integration's own secret key.
  const paystackWebhookSecret = paystackSecret;
  // In Vercel Preview, callbacks must return to this deployment, not the live site.
  const appUrl = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const ticketPepper = process.env.TICKET_TOKEN_PEPPER ?? "";

  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!ticketPepper) missing.push("TICKET_TOKEN_PEPPER");
  if (!paystackSecret) missing.push("PAYSTACK_SECRET_KEY (paid checkout disabled)");
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY (email logging only)");

  return {
    supabaseUrl,
    supabaseAnonKey,
    serviceRoleKey,
    paystackSecret,
    paystackWebhookSecret,
    appUrl,
    ticketPepper,
    emailFrom: process.env.EMAIL_FROM ?? "JaiyePass <no-reply@jaiyepass.com>",
    missing,
    testMode: process.env.NODE_ENV !== "production" && !paidCheckoutConfigured(),
  };
}

/**
 * Guest checkout is gated while the guest-order migration is staged.
 * Enable on staging only after applying it and configuring email delivery.
 * Never use a NEXT_PUBLIC_ flag for this server-side authorization decision.
 */
export function guestCheckoutEnabled(): boolean {
  return process.env.GUEST_CHECKOUT_ENABLED === "true"
    && Boolean(process.env.TICKET_TOKEN_PEPPER)
    && Boolean(process.env.RESEND_API_KEY);
}

/** Never allow a live or malformed Paystack key to initiate a transaction in Preview. */
export function paystackKeyAllowed(key: string, environment?: string): boolean {
  return environment !== "preview" || key.startsWith("sk_test_");
}
