import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ orderId: z.string().uuid() });

/**
 * Attendee refund request. Creates a `requested` refund row; hosts/admins
 * approve and process it from the host dashboard (which calls Paystack).
 *
 * Refund window (default policy): up to 48 hours before the event starts.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const rl = rateLimit(`refund:${clientIp(req)}`, { limit: 5, windowMs: 30 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many refund requests — try again later.` },
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

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, total_kobo, user_id, event:events(title, starts_at, refund_policy)")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ error: "Only paid orders can be refunded." }, { status: 409 });
  }

  const startsAt = (order.event as unknown as { starts_at: string } | null)?.starts_at;
  if (startsAt && Date.now() > new Date(startsAt).getTime() - 48 * 3600_000) {
    return NextResponse.json(
      { error: "This event starts in less than 48 hours — refunds are closed." },
      { status: 409 },
    );
  }

  const { data: existing } = await admin
    .from("refunds")
    .select("id, status")
    .eq("order_id", order.id)
    .in("status", ["requested", "approved"])
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "A refund is already in progress for this order." },
      { status: 409 },
    );
  }

  const { error } = await admin.from("refunds").insert({
    order_id: order.id,
    amount_kobo: order.total_kobo,
    reason: "Requested by attendee",
    status: "requested",
    requested_by: user.id,
    status_history: [{ at: new Date().toISOString(), to: "requested", via: "attendee" }] as never,
  });

  if (error) {
    console.error("refund insert failed", error.code);
    return NextResponse.json({ error: "Could not submit the refund request." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
