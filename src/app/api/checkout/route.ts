import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createPendingOrder } from "@/lib/checkout";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  eventId: z.string().uuid(),
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
  if (!user) {
    return NextResponse.json({ error: "Sign in to buy tickets." }, { status: 401 });
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

  const result = await createPendingOrder({
    userId: user.id,
    eventId: parsed.data.eventId,
    items: parsed.data.items,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    orderId: result.orderId,
    totalKobo: result.totalKobo,
    holdExpiresAt: result.holdExpiresAt,
  });
}
