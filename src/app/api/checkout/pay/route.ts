import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getOrderAccess } from "@/lib/guest-checkout";
import { initializeOrderPayment } from "@/lib/checkout";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ orderId: z.string().uuid() });

/**
 * Initialize payment for a pending order owned by the caller. Returns the
 * Paystack authorization URL, or `testMode: true` when no provider key is
 * configured (local development only — no tickets are issued without
 * a verified payment or an authorized free booking).
 */
export async function POST(req: Request) {
 
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

  const access = await getOrderAccess(parsed.data.orderId);
  if (!access) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const signedIn = access.userId ? await getSessionUser() : null;
  const result = await initializeOrderPayment({
    orderId: parsed.data.orderId,
    userId: access.userId,
    userEmail: access.guestEmail ?? signedIn?.email ?? "",
    guestToken: access.guestToken,
  });

  if (!result.ok || !result.authorizationUrl) {
    return NextResponse.json({ error: result.error ?? "Could not start payment." }, { status: 400 });
  }

  return NextResponse.json({
    authorizationUrl: result.authorizationUrl,
    testMode: result.testMode ?? false,
  });
}
