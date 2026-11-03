import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { computePromoDiscount } from "@/lib/checkout";
import { orderTotals } from "@/lib/money";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderId: z.string().uuid(),
  code: z.string().trim().min(1).max(40),
});

/**
 * Apply (or clear) a promo code to a pending order. Totals are always
 * recomputed server-side from the order's own subtotal; the browser never
 * sets an amount. Redemption counters are incremented at apply time.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const rl = rateLimit(`promo:${clientIp(req)}`, RATE_LIMITS.promo);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid promo code." }, { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, user_id, subtotal_kobo, fee_kobo, total_kobo, discount_kobo, promo_code_id, event_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  // Once Paystack has initialized, the amount is frozen to avoid mismatches.
  if (order.status !== "pending") {
    return NextResponse.json({ error: "This order can no longer be changed." }, { status: 409 });
  }

  // Clearing an existing code restores the undiscounted totals.
  if (parsed.data.code === "REMOVE") {
    if (!order.promo_code_id) {
      return NextResponse.json({ error: "No promo code on this order." }, { status: 409 });
    }
    const totals = orderTotals(order.subtotal_kobo, 0);
    await admin
      .from("orders")
      .update({
        promo_code_id: null,
        discount_kobo: 0,
        fee_kobo: totals.feeKobo,
        total_kobo: totals.totalKobo,
      })
      .eq("id", order.id);

    // Return the redemption to the pool.
    const { data: oldPromo } = await admin
      .from("promo_codes")
      .select("id, redemptions_used")
      .eq("id", order.promo_code_id)
      .maybeSingle();
    if (oldPromo && oldPromo.redemptions_used > 0) {
      await admin
        .from("promo_codes")
        .update({ redemptions_used: oldPromo.redemptions_used - 1 })
        .eq("id", oldPromo.id);
    }

    return NextResponse.json({ ok: true, ...totals });
  }

  const organizationId = await lookupOrgId(admin, order.event_id);

  if (!organizationId) {
    return NextResponse.json({ error: "That code is not valid for this event." }, { status: 400 });
  }

  const result = await computePromoDiscount({
    code: parsed.data.code,
    eventId: order.event_id,
    organizationId,
    subtotalKobo: order.subtotal_kobo,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const totals = orderTotals(order.subtotal_kobo, result.discountKobo);

  // Swap codes: return the old redemption first.
  if (order.promo_code_id && order.promo_code_id !== result.promoId) {
    const { data: oldPromo } = await admin
      .from("promo_codes")
      .select("id, redemptions_used")
      .eq("id", order.promo_code_id)
      .maybeSingle();
    if (oldPromo && oldPromo.redemptions_used > 0) {
      await admin
        .from("promo_codes")
        .update({ redemptions_used: oldPromo.redemptions_used - 1 })
        .eq("id", oldPromo.id);
    }
  }

  if (order.promo_code_id !== result.promoId) {
    const { data: promo } = await admin
      .from("promo_codes")
      .select("id, redemptions_used, max_redemptions")
      .eq("id", result.promoId)
      .maybeSingle();
    if (
      promo &&
      promo.max_redemptions !== null &&
      promo.redemptions_used >= promo.max_redemptions
    ) {
      return NextResponse.json({ error: "That code has been fully redeemed." }, { status: 409 });
    }
    if (promo) {
      await admin
        .from("promo_codes")
        .update({ redemptions_used: promo.redemptions_used + 1 })
        .eq("id", promo.id);
    }
  }

  const { error: updErr } = await admin
    .from("orders")
    .update({
      promo_code_id: result.promoId,
      discount_kobo: totals.discountKobo,
      fee_kobo: totals.feeKobo,
      total_kobo: totals.totalKobo,
    })
    .eq("id", order.id);

  if (updErr) {
    console.error("promo apply failed", updErr.code);
    return NextResponse.json({ error: "Could not apply the code. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...totals });
}

async function lookupOrgId(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .maybeSingle();
  return data?.organization_id ?? null;
}
