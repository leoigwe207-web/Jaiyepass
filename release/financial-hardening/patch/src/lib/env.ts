// Server-only environment access. Import this ONLY from server code.

export function isTestMode(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.PAYSTACK_SECRET_KEY;
}

export function serverEnv() {
  const missing: string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY ?? "";
  // Paystack signs webhooks with the integration's own secret key.
  const paystackWebhookSecret = paystackSecret;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
    testMode: process.env.NODE_ENV !== "production" && !paystackSecret,
  };
}
