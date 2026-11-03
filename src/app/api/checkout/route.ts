import { NextResponse } from "next/server";
import { createGuestToken, hashGuestToken, guestCookieName } from "@/lib/guest-checkout";
import { guestCheckoutEnabled } from "@/lib/env";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createPendingOrder } from "@/lib/checkout";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  guest: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
  }).optional(),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(10),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user && !guestCheckoutEnabled()) {
    return NextResponse.json({ error: "Guest checkout is not available yet. Please sign in." }, { status: 401 });
  }

  const rl = rateLimit(`checkout:${clientIp(req)}`, RATE_LIMITS.checkout);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many checkout attempts — try again in ${rl.retryAfterSeconds}s.` },
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
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ticket selection." }, { status: 400 });
  }

  if (!user && !parsed.data.guest) {
    return NextResponse.json({ error: "Enter your name and email for ticket delivery." }, { status: 400 });
  }
  const token = user ? null : createGuestToken();
  const result = await createPendingOrder({
    userId: user?.id ?? null,
    guestName: user ? undefined : parsed.data.guest?.fullName,
    guestEmail: user ? undefined : parsed.data.guest?.email,
    guestTokenHash: token ? hashGuestToken(token) : undefined,
    eventId: parsed.data.eventId,
    items: parsed.data.items,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({
    orderId: result.orderId,
    totalKobo: result.totalKobo,
    holdExpiresAt: result.holdExpiresAt,
  }, { headers: { "Cache-Control": "no-store" } });
  if (token) response.cookies.set(guestCookieName(result.orderId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24,
  });
  return response;
}
