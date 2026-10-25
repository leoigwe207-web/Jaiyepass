import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { isTestMode } from "@/lib/env";
import { serverEnv } from "@/lib/env";
import { deliverReceipt } from "@/lib/checkout";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ orderId: z.string().uuid() });

/**
 * LOCAL DEVELOPMENT ONLY. With no PAYSTACK_SECRET_KEY configured the app runs
 * in "test mode": payments cannot be taken, so this route simulates a
 * successful payment and finalizes the order through the same idempotent
 * finalize function the webhook uses. It returns 404 whenever a provider key
 * is configured or outside development, so it can never issue free tickets in
 * production.
 */
export async function POST(req: Request) {
  if (!isTestMode() || process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

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
    .select("id, status, user_id, total_kobo")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status === "paid") return NextResponse.json({ status: "already_finalized" });
  if (order.status !== "pending" && order.status !== "awaiting_payment") {
    return NextResponse.json({ error: "This order can no longer be paid." }, { status: 409 });
  }

  const reference = order.total_kobo === 0 ? `free-${order.id.slice(0, 8)}` : `test_${order.id.slice(0, 12)}`;

  await admin.from("payments").upsert(
    {
      order_id: order.id,
      reference,
      amount_kobo: order.total_kobo,
      currency: "NGN",
      status: "pending",
      channel: "test",
    },
    { onConflict: "reference", ignoreDuplicates: true },
  );

  const { error } = await admin.rpc("finalize_paid_order", {
    p_order_id: order.id,
    p_reference: reference,
    p_channel: "test",
    p_pepper: serverEnv().ticketPepper,
  });

  if (error) {
    console.error("test finalize failed", error.message);
    return NextResponse.json({ error: "Could not finalize the test order." }, { status: 500 });
  }

  await deliverReceipt(order.id);

  return NextResponse.json({ status: "paid" });
}
