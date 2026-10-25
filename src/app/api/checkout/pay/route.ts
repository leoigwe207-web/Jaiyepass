import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { initializeOrderPayment } from "@/lib/checkout";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ orderId: z.string().uuid() });

/**
 * Initialize payment for a pending order owned by the caller. Returns the
 * Paystack authorization URL, or `testMode: true` when no provider key is
 * configured (local development only — no tickets are issued until the
 * dev-complete route or webhook finalizes the order).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const rl = rateLimit(`pay:${clientIp(req)}`, RATE_LIMITS.checkout);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many payment attempts — try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });

  const result = await initializeOrderPayment({
    orderId: parsed.data.orderId,
    userId: user.id,
    userEmail: user.email,
  });

  if (!result.ok || !result.authorizationUrl) {
    return NextResponse.json({ error: result.error ?? "Could not start payment." }, { status: 400 });
  }

  return NextResponse.json({
    authorizationUrl: result.authorizationUrl,
    testMode: result.testMode ?? false,
  });
}
