import { NextResponse } from "next/server";
import { createGuestToken, hashGuestToken, guestCookieName } from "@/lib/guest-checkout";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createPendingOrder } from "@/lib/checkout";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  guest: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
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

  const guest = parsed.data.guest;
  if (!user && !guest) return NextResponse.json({ error: "Enter your name and email to receive tickets." }, { status: 400 });
  const token = user ? null : createGuestToken();
  const result = await createPendingOrder({
    userId: user?.id ?? null,
    guestName: guest?.fullName.trim(),
    guestEmail: guest?.email.trim().toLowerCase(),
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
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400,
  });
  return response;
}
