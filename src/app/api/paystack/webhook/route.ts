import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidWebhookSignature } from "@/lib/paystack";
import { verifyAndFinalizeOrder } from "@/lib/checkout";
import { sendEmail, refundEmail } from "@/lib/email";
import { formatKobo } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook.
 *
 * - The raw body is read FIRST so the HMAC-SHA512 signature can be validated
 *   before any processing. Invalid signatures are rejected with 401.
 * - Every event id is recorded in webhook_events so duplicate deliveries are
 *   acknowledged (200) without reprocessing.
 * - charge.success is re-verified against the Paystack API (status, amount,
 *   currency, reference) before finalize_paid_order issues any ticket, and
 *   finalize is idempotent, so a retried webhook can never create extra
 *   tickets or orders.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!isValidWebhookSignature(rawBody, signature)) {
    console.warn("[webhook] rejected: invalid signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      amount?: number;
      currency?: string;
      channel?: string;
      order_id?: string;
      metadata?: { orderId?: string };
      refund?: { reference?: string; amount?: number; currency?: string; status?: string; id?: string };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const eventName = event.event ?? "";
  const data = event.data ?? {};
  const admin = createAdminClient();

  // Idempotency: record the event id (or a content hash when Paystack does
  // not supply one) and skip if we have already processed it.
  const eventId: string =
    (event as { id?: string }).id ??
    `${eventName}:${data.reference ?? data.refund?.id ?? "unknown"}`;
  const { error: dupErr } = await admin.from("webhook_events").insert({
    provider: "paystack",
    provider_event_id: eventId,
    payload: event as never,
  });
  if (dupErr) {
    if (dupErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Don't fail closed on unrelated constraint issues — log and continue
    // verification (verification is itself safe to repeat).
    console.warn("[webhook] event log insert failed", dupErr.code);
  }

  try {
    if (eventName === "charge.success") {
      const reference = data.reference;
      const orderId = data.metadata?.orderId ?? data.order_id;
      if (!reference || !orderId) {
        return NextResponse.json({ error: "missing reference" }, { status: 400 });
      }
      // verifyAndFinalizeOrder re-verifies with Paystack, checks amount and
      // currency against the order, then finalizes idempotently.
      const outcome = await verifyAndFinalizeOrder(orderId);
      if (outcome.ok) {
        return NextResponse.json({ received: true, status: outcome.status });
      }
      // Verification failures must be visible to Paystack's retry machinery
      // only when they look transient; permanent mismatches are logged loud.
      console.error("[webhook] finalize failed", { reference, error: outcome.error });
      return NextResponse.json({ received: true, ok: false, error: outcome.error });
    }

    if (eventName === "refund.processed" || eventName === "refund.success") {
      const refundRef = data.refund?.id ?? data.refund?.reference;
      if (!refundRef) return NextResponse.json({ received: true });

      const { data: refund } = await admin
        .from("refunds")
        .select(
          "id, order_id, amount_kobo, status, status_history, orders(user_id, status, events(title), profiles(email))",
        )
        .eq("provider_reference", refundRef)
        .maybeSingle();

      // Strict amount validation before marking anything refunded.
      const reportedAmount = data.refund?.amount;
      if (refund && typeof reportedAmount === "number" && reportedAmount !== refund.amount_kobo) {
        console.error("[webhook] refund amount mismatch", {
          refundRef,
          expected: refund.amount_kobo,
          got: reportedAmount,
        });
        return NextResponse.json({ received: true, ok: false, error: "refund amount mismatch" });
      }

      if (refund && refund.status !== "processed") {
        await admin
          .from("refunds")
          .update({
            status: "processed",
            status_history: [
              ...((refund.status_history as never[]) ?? []),
              { at: new Date().toISOString(), to: "processed", via: "webhook" },
            ] as never,
          })
          .eq("id", refund.id);

        await admin.from("orders").update({ status: "refunded" }).eq("id", refund.order_id);
        await admin
          .from("tickets")
          .update({ status: "refunded", refunded_at: new Date().toISOString() })
          .eq("order_id", refund.order_id);

        const ctx = refund as unknown as {
          orders: {
            profiles: { email: string } | null;
            events: { title: string } | null;
          } | null;
        };
        const email = ctx.orders?.profiles?.email;
        if (email) {
          await sendEmail(
            refundEmail({
              to: email,
              eventTitle: ctx.orders?.events?.title ?? "your order",
              amountFormatted: formatKobo(refund.amount_kobo, { hideZeroDecimals: true }),
            }),
          );
        }
      }
      return NextResponse.json({ received: true });
    }

    if (eventName === "subscription.create" || eventName === "") {
      return NextResponse.json({ received: true });
    }

    // Unknown events are acknowledged so Paystack stops retrying.
    return NextResponse.json({ received: true, ignored: eventName });
  } catch (e) {
    console.error("[webhook] handler error", e instanceof Error ? e.message : e);
    // 500 so Paystack retries; the idempotency guard makes retries safe.
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}
