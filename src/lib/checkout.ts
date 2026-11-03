import "server-only";
import { isValidGuestToken } from "./guest-token";
import { createAdminClient } from "./supabase/admin";
import { serverEnv } from "./env";
import { orderTotals, computeFee, percentOff, formatKobo, type Kobo } from "./money";
import { initializeTransaction, verifyTransaction } from "./paystack";
import { receiptEmail } from "./email";
import { sendEmail } from "./email";
import { deriveQrPayload } from "./ticket-token";

/**
 * Checkout core (server-only).
 *
 * Trust model: prices, fees, discounts and quantities are ALWAYS recomputed
 * from database rows here. Browser-submitted totals are never read. Payment
 * is only considered successful after Paystack verification (route or
 * webhook) AND a matching amount/currency/reference on our order row.
 */

export interface CheckoutItemInput {
  ticketTypeId: string;
  quantity: number;
}

export type CheckoutFailure =
  | { ok: false; status: number; error: string }
  | {
      ok: false;
      status: number;
      error: string;
      fieldErrors?: Record<string, string>;
    };

export type CheckoutSuccess = {
  ok: true;
  orderId: string;
  totalKobo: Kobo;
  holdExpiresAt: string;
};

const HOLD_MINUTES = 10;

/** Append a status transition to the order's jsonb history trail. */
function appendHistory(
  current: unknown,
  to: string,
  via: string,
): never[] {
  const list = Array.isArray(current) ? current : [];
  return [...list, { at: new Date().toISOString(), to, via }] as never[];
}

/**
 * Create a pending order with an expiring inventory hold. The hold is placed
 * by the SECURITY DEFINER function create_inventory_hold which locks the
 * ticket_types row, expires stale holds, and refuses to oversell.
 */
export async function createPendingOrder(opts: {
  userId: string | null;
  eventId: string;
  items: CheckoutItemInput[];
  guestName?: string;
  guestEmail?: string;
  guestTokenHash?: string;
}): Promise<CheckoutSuccess | CheckoutFailure> {
  const admin = createAdminClient();
  const { userId, eventId, items } = opts;
  if (userId === null && (
    !opts.guestName || !opts.guestEmail || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(opts.guestEmail)
    || !/^[0-9a-f]{64}$/.test(opts.guestTokenHash ?? "")
  )) return { ok: false, status: 400, error: "Name and email are required for guest tickets." };

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 400, error: "Choose at least one ticket." };
  }

  // Basic shape validation before touching the database.
  for (const item of items) {
    if (
      typeof item?.ticketTypeId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(item.ticketTypeId) ||
      !Number.isInteger(item?.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100
    ) {
      return { ok: false, status: 400, error: "Invalid ticket selection." };
    }
    if (items.filter((i) => i.ticketTypeId === item.ticketTypeId).length > 1) {
      return { ok: false, status: 400, error: "Duplicate ticket selection." };
    }
  }

  // The event must be published and on sale.
  const { data: event } = await admin
    .from("events")
    .select("id, status, organization_id, title, is_demo, starts_at")
    .eq("id", eventId)
    .maybeSingle();

  // Demo listings are not real events; never issue orders or tickets for them.
  // Also reject bookings after an event has started.
  if (
    !event ||
    event.status !== "published" ||
    event.is_demo === true ||
    !event.starts_at ||
    new Date(event.starts_at).getTime() <= Date.now()
  ) {
    return { ok: false, status: 404, error: "This event is not available." };
  }

  // Load trusted ticket-type rows for every requested type.
  const ids = items.map((i) => i.ticketTypeId);
  const { data: ticketTypes } = await admin
    .from("ticket_types")
    .select("id, event_id, name, price_kobo, quantity, sold_count, per_order_limit, status, sales_start_at, sales_end_at")
    .in("id", ids);

  const byId = new Map((ticketTypes ?? []).map((tt) => [tt.id, tt]));
  if (byId.size !== ids.length) {
    return { ok: false, status: 400, error: "One of the ticket types no longer exists." };
  }

  const holdIds: string[] = [];
  const releaseHolds = async () => {
    if (holdIds.length === 0) return;
    await admin.from("inventory_holds").update({ status: "released" }).in("id", holdIds);
  };

  let subtotal: Kobo = 0;

  // Place holds one type at a time; each call is atomic per ticket type.
  for (const item of items) {
    const tt = byId.get(item.ticketTypeId)!;
    if (tt.event_id !== eventId) {
      await releaseHolds();
      return { ok: false, status: 400, error: "Ticket does not belong to this event." };
    }
    const { data: holdId, error } = await admin.rpc("create_inventory_hold", {
      p_ticket_type_id: tt.id,
      p_quantity: item.quantity,
      p_minutes: HOLD_MINUTES,
    });
    if (error || !holdId) {
      await releaseHolds();
      const msg = error?.message ?? "";
      if (msg.includes("not enough")) {
        return { ok: false, status: 409, error: `Not enough ${tt.name} tickets left.` };
      }
      if (msg.includes("per-order limit")) {
        return { ok: false, status: 400, error: `Maximum ${tt.per_order_limit} ${tt.name} tickets per order.` };
      }
      if (msg.includes("not open") || msg.includes("not started") || msg.includes("have ended")) {
        return { ok: false, status: 400, error: `${tt.name} sales are not open right now.` };
      }
      console.error("create_inventory_hold failed", msg);
      return { ok: false, status: 409, error: "Could not reserve tickets — try again." };
    }
    holdIds.push(holdId as string);
    subtotal += tt.price_kobo * item.quantity;
  }

  const totals = orderTotals(subtotal, 0);
  const primaryHold = holdIds[0]!;

  // One hold row carries the order link (schema: holds are per ticket type,
  // so we track the first as the order's hold for expiry bookkeeping and
  // cancel the rest at finalize; simplest correct MVP: attach order to all).
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      guest_name: userId === null ? opts.guestName : null,
      guest_email: userId === null ? opts.guestEmail : null,
      guest_token_hash: userId === null ? opts.guestTokenHash : null,
      event_id: eventId,
      status: "pending",
      subtotal_kobo: totals.subtotalKobo,
      discount_kobo: 0,
      fee_kobo: totals.feeKobo,
      total_kobo: totals.totalKobo,
      currency: "NGN",
      hold_id: primaryHold,
    })
    .select("id, created_at")
    .single();

  if (orderErr || !order) {
    await releaseHolds();
    console.error("order insert failed", orderErr?.code);
    return { ok: false, status: 500, error: "Could not create your order. Try again." };
  }

  // Link all holds to the order so expiry can mark the order expired.
  const { error: linkError } = await admin.from("inventory_holds").update({ order_id: order.id }).in("id", holdIds);
  if (linkError) {
    await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    await releaseHolds();
    console.error("inventory hold link failed", linkError.code);
    return { ok: false, status: 500, error: "Could not reserve your tickets. Please try again." };
  }

  const itemRows = items.map((i) => {
    const tt = byId.get(i.ticketTypeId)!;
    return {
      order_id: order.id,
      ticket_type_id: tt.id,
      name_snapshot: tt.name,
      unit_price_kobo: tt.price_kobo,
      quantity: i.quantity,
    };
  });
  const { error: itemsErr } = await admin.from("order_items").insert(itemRows);
  if (itemsErr) {
    await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    await releaseHolds();
    console.error("order_items insert failed", itemsErr.code);
    return { ok: false, status: 500, error: "Could not create your order. Try again." };
  }

  const { data: originalHold } = await admin.from("inventory_holds").select("expires_at").eq("id", primaryHold).maybeSingle();
  const expires = originalHold?.expires_at ?? new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();

  // Test mode: don't initialize a real Paystack transaction; the checkout
  // page shows a clearly-labelled test flow that cannot issue real tickets.
  return { ok: true, orderId: order.id, totalKobo: totals.totalKobo, holdExpiresAt: expires };
}

export interface InitPaymentResult {
  ok: boolean;
  authorizationUrl?: string;
  testMode?: boolean;
  error?: string;
}

/**
 * Initialize the Paystack transaction for an existing pending order owned by
 * this user. Recomputes nothing here — the order row's totals (set from DB
 * rows at order creation) are the trusted amount.
 */
export async function initializeOrderPayment(opts: {
  orderId: string;
  userId: string | null;
  userEmail: string;
  guestToken?: string | null;
}): Promise<InitPaymentResult> {
  const admin = createAdminClient();
  const { orderId, userId, userEmail } = opts;

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, guest_email, guest_token_hash, status, total_kobo, currency, event_id, paystack_reference, events(title, slug)")
    .eq("id", orderId)
    .maybeSingle();

  if (order && (userId !== null
    ? order.user_id !== userId
    : order.user_id !== null || !opts.guestToken || !order.guest_token_hash
      || !isValidGuestToken(opts.guestToken, order.guest_token_hash)
      || order.guest_email !== userEmail)) {
    return { ok: false, error: "Order not found." };
  }

  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "paid") return { ok: false, error: "This order is already paid." };
  if (order.status !== "pending" && order.status !== "awaiting_payment") {
    return { ok: false, error: "This order can no longer be paid." };
  }

  // Every line item must still have an active hold before a payment starts.
  // Never initiate a new transaction for an expired or unreserved order.
  const { data: holds, error: holdsError } = await admin
    .from("inventory_holds")
    .select("id, status, expires_at")
    .eq("order_id", orderId);
  if (holdsError || !holds?.length ||
      holds.some((h) => h.status !== "active" || new Date(h.expires_at).getTime() <= Date.now())) {
    return { ok: false, error: "Your ticket reservation expired. Please select tickets again." };
  }

  const { paystackSecret, appUrl } = serverEnv();

  // Free orders: skip Paystack entirely and finalize directly.
  if (order.total_kobo === 0) {
    const reference = `free-${orderId.replace(/-/g, "").slice(0, 16)}`;
    // Record the zero-value payment so the ledger always has a row.
    await admin.from("payments").upsert(
      { order_id: orderId, reference, amount_kobo: 0, currency: "NGN", status: "pending", channel: "free" },
      { onConflict: "reference", ignoreDuplicates: true },
    );
    const result = await admin.rpc("finalize_paid_order", {
      p_order_id: orderId,
      p_reference: reference,
      p_channel: "free",
      p_pepper: serverEnv().ticketPepper,
    });
    if (result.error) {
      console.error("finalize failed", result.error.message);
      return { ok: false, error: "Could not confirm the order." };
    }
    await deliverReceipt(orderId);
    return { ok: true, testMode: false, authorizationUrl: `/checkout/${orderId}/success` };
  }

  if (!paystackSecret) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Secure paid checkout is not yet configured. Please try again later." };
    }
    // Clearly-labelled local-only simulation: no provider call, and
    // finalize is NOT invoked — so no tickets are issued.
    return {
      ok: true,
      testMode: true,
      authorizationUrl: `/checkout/${orderId}?test=1`,
    };
  }

  if (process.env.VERCEL_ENV === "production" && paystackSecret.startsWith("sk_test_")) {
    return { ok: false, error: "Test payment keys cannot be used for public ticket sales." };
  }

  // Reuse the existing reference if one is stored, so retries don't leave
  // orphan transactions.
  const reference = order.paystack_reference ?? `jp_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;

  const init = await initializeTransaction({
    reference,
    email: userId === null ? (order.guest_email ?? "") : userEmail,
    amountKobo: order.total_kobo,
    callbackUrl: `${appUrl}/checkout/${orderId}/success`,
    metadata: { orderId, eventId: order.event_id, ...(userId ? { userId } : {}) },
  });

  if (!init.ok || !init.authorizationUrl) {
    console.error("paystack init failed", init.error);
    return { ok: false, error: "Payment provider is unavailable — try again shortly." };
  }

  await admin
    .from("orders")
    .update({ status: "awaiting_payment", paystack_reference: reference })
    .eq("id", orderId)
    .eq("status", "pending");

  const { error: payErr } = await admin.from("payments").upsert(
    {
      order_id: orderId,
      reference,
      amount_kobo: order.total_kobo,
      currency: "NGN",
      status: "pending",
    },
    { onConflict: "reference", ignoreDuplicates: false },
  );
  if (payErr) console.error("payment row upsert failed", payErr.code);

  return { ok: true, authorizationUrl: init.authorizationUrl };
}

export type VerifyOutcome =
  | { ok: true; orderId: string; status: "paid" | "already_finalized" }
  | { ok: false; error: string; orderStatus?: string };

/**
 * Verify a transaction with Paystack, validate amount/currency/reference
 * against our order, then finalize (issue tickets) idempotently. Used by both
 * the success-page route and the webhook — whichever arrives first wins,
 * because finalize_paid_order is idempotent.
 */
export async function verifyAndFinalizeOrder(orderId: string, incomingReference?: string): Promise<VerifyOutcome> {
  const admin = createAdminClient();
  const env = serverEnv();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, total_kobo, currency, paystack_reference, status_history")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found." };
  // A signed webhook is not authorization to finalize another reference.
  if (incomingReference && order.paystack_reference !== incomingReference) {
    return { ok: false, error: "Webhook reference does not match the order." };
  }
  if (order.status === "paid") {
    await deliverReceipt(orderId);
    return { ok: true, orderId, status: "already_finalized" };
  }
  if (order.status !== "pending" && order.status !== "awaiting_payment") {
    return { ok: false, error: "Order is not payable; reconcile the payment manually.", orderStatus: order.status };
  }

  const reference = order.paystack_reference;
  if (!reference) return { ok: false, error: "No payment reference for this order." };

  if (!env.paystackSecret) {
    // Test mode: NEVER finalize. Make it explicit to the caller.
    return { ok: false, error: "test-mode", orderStatus: order.status };
  }

  const verification = await verifyTransaction(reference);
  if (!verification.ok || !verification.status) {
    return { ok: false, error: "Could not verify the payment with Paystack." };
  }

  if (verification.status !== "success") {
    if (verification.status === "failed" || verification.status === "abandoned") {
      await admin
        .from("orders")
        .update({
          status: "failed",
          failure_reason: "Payment was not completed.",
          status_history: appendHistory(order.status_history, "failed", "verify"),
        })
        .eq("id", orderId)
        .eq("status", order.status);
    }
    return { ok: false, error: `Payment ${verification.status}.`, orderStatus: verification.status };
  }

  // Confirm the provider answered for exactly the reference we requested.
  if (verification.reference !== reference) {
    console.error("provider reference mismatch", { orderId });
    return { ok: false, error: "Payment reference does not match the order." };
  }

  // Strict validation before issuing anything.
  if (verification.amountKobo !== order.total_kobo) {
    // Never mark the order paid on an amount mismatch; leave the payment row
    // pending and surface the discrepancy loudly for reconciliation.
    console.error("amount mismatch", { reference, expected: order.total_kobo, got: verification.amountKobo });
    return { ok: false, error: "Payment amount does not match the order." };
  }
  if ((verification.currency ?? "").toUpperCase() !== order.currency.toUpperCase()) {
    console.error("currency mismatch", { reference, expected: order.currency, got: verification.currency });
    return { ok: false, error: "Payment currency does not match the order." };
  }

  // Confirm that every reserved tier is still held; the staged database
  // migration additionally enforces this atomically against concurrent sales.
  const { data: holds, error: holdError } = await admin
    .from("inventory_holds").select("id, status, expires_at").eq("order_id", orderId);
  if (holdError || !holds?.length ||
      holds.some((h) => h.status !== "active" || new Date(h.expires_at).getTime() <= Date.now())) {
    console.error("payment requires reconciliation: ticket hold expired", { orderId });
    return { ok: false, error: "Payment received after ticket reservation expired; contact support for reconciliation." };
  }

  const { data: result, error: fnErr } = await admin.rpc("finalize_paid_order", {
    p_order_id: orderId,
    p_reference: reference,
    p_channel: verification.channel ?? null,
    p_pepper: env.ticketPepper,
  });

  if (fnErr) {
    console.error("finalize_paid_order failed", fnErr.message);
    return { ok: false, error: "Could not issue tickets — contact support with your reference." };
  }

  const status = (result?.status as "paid" | "already_finalized") ?? "paid";

  if (status === "paid" || status === "already_finalized") {
    await deliverReceipt(orderId);
  }

  return { ok: true, orderId, status };
}

/**
 * Sends one email per PAID order with a separate PNG QR attachment per ticket.
 * The DB claim is atomic and prevents duplicate concurrent sends from Paystack
 * and the payment-return page. Failed deliveries can be retried; email
 * transmission never determines whether a verified payment is considered paid.
 */
export async function deliverReceipt(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const env = serverEnv();
  if (!env.ticketPepper) {
    console.error("[ticket-email] no ticket pepper configured");
    return;
  }
  const { data: order, error: readError } = await admin
    .from("orders")
    .select(`id, status, total_kobo, paystack_reference, user_id, guest_name, guest_email,
       profile:profiles(email, full_name),
       event:events(title, starts_at, venue:venues(name), city:cities(name)),
       tickets(id, status)`)
    .eq("id", orderId)
    .maybeSingle();

  if (readError || !order || order.status !== "paid") return;
  const profile = (order as unknown as { profile: { email: string; full_name: string | null } | null }).profile;
  const event = (order as unknown as { event: { title: string; starts_at: string } | null }).event;
  const tickets = (order as unknown as { tickets: { id: string; status: string }[] }).tickets ?? [];
  const guest = order as unknown as { guest_name: string | null; guest_email: string | null; user_id: string | null };
  const recipientEmail = profile?.email ?? guest.guest_email;
  const recipientName = profile?.full_name ?? guest.guest_name ?? "there";
  if (!recipientEmail || !tickets.length || tickets.some((t) => t.status !== "issued")) return;

  // Only ONE request can own this send attempt. Uses a 10-minute lease so a
  // crashed server cannot permanently block delivery. Requires migration 08.
  const claim = await admin.rpc("claim_ticket_email_delivery", { p_order_id: orderId });
  if (claim.error || claim.data !== true) {
    if (claim.error) console.error("[ticket-email] claim failed", claim.error.code);
    return;
  }

  try {
    const QRCode = await import("qrcode");
    const ticketLinks: string[] = [];
    const qrAttachments: { filename: string; content: string; content_type: string }[] = [];
    for (const [index, ticket] of tickets.entries()) {
      const payload = deriveQrPayload(ticket.id, env.ticketPepper);
      if (guest.user_id) ticketLinks.push(`${env.appUrl}/account/tickets`);
      const png = await QRCode.toBuffer(payload, {
        type: "png", width: 360, margin: 2, errorCorrectionLevel: "M",
      });
      qrAttachments.push({
        filename: `JaiyePass-ticket-${index + 1}.png`,
        content: png.toString("base64"),
        content_type: "image/png",
      });
    }
    const msg = receiptEmail({
      to: recipientEmail,
      name: recipientName,
      eventTitle: event?.title || "your event",
      startsAt: event ? new Date(event.starts_at).toUTCString() : "",
      quantity: tickets.length,
      totalFormatted: formatKobo(order.total_kobo, { hideZeroDecimals: true }),
      reference: order.paystack_reference ?? `order-${orderId}`,
      ticketLinks,
      qrAttachments,
    });
    const result = await sendEmail(msg);
    const update = result.status === "sent"
      ? { status: "sent", provider_message_id: result.providerMessageId ?? null, sent_at: new Date().toISOString(), last_error: null }
      : { status: "failed", last_error: result.status === "logged" ? "Email provider is not configured" : result.error.slice(0, 160) };
    const { error } = await admin.from("ticket_email_deliveries").update(update).eq("order_id", orderId);
    if (error) console.error("[ticket-email] status recording failed", error.code);
    if (result.status !== "sent") console.warn(`[ticket-email] not sent for order ${orderId}: ${result.status}`);
  } catch (err) {
    console.error("[ticket-email] generate/send failed", err instanceof Error ? err.message : "unknown");
    await admin.from("ticket_email_deliveries").update({ status: "failed", last_error: "QR generation or email provider error" }).eq("order_id", orderId);
  }
}

/**
 * Recompute the fee preview for a promo code at checkout time (server-side).
 * Returns the discount in kobo, or a failure reason.
 */
export async function computePromoDiscount(opts: {
  code: string;
  eventId: string;
  organizationId: string;
  subtotalKobo: Kobo;
}): Promise<{ ok: true; discountKobo: Kobo; promoId: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { code, eventId, organizationId, subtotalKobo } = opts;

  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalized)) {
    return { ok: false, error: "Enter a valid promo code." };
  }

  const { data: promo } = await admin
    .from("promo_codes")
    .select("id, code, kind, value, max_redemptions, redemptions_used, starts_at, ends_at, is_active, event_id")
    .eq("organization_id", organizationId)
    .ilike("code", normalized)
    .maybeSingle();

  if (!promo || !promo.is_active) return { ok: false, error: "That promo code is not active." };
  if (promo.event_id && promo.event_id !== eventId) return { ok: false, error: "That code is not valid for this event." };
  if (promo.starts_at && new Date(promo.starts_at) > new Date()) {
    return { ok: false, error: "That code is not active yet." };
  }
  if (promo.ends_at && new Date(promo.ends_at) < new Date()) {
    return { ok: false, error: "That code has expired." };
  }
  if (promo.max_redemptions !== null && promo.redemptions_used >= promo.max_redemptions) {
    return { ok: false, error: "That code has been fully redeemed." };
  }

  const discount =
    promo.kind === "percentage" ? percentOff(subtotalKobo, promo.value) : Math.min(promo.value, subtotalKobo);

  return { ok: true, discountKobo: discount, promoId: promo.id };
}

/** Server-side fee preview used by the checkout page (no promo). */
export function previewTotals(subtotalKobo: Kobo, discountKobo: Kobo) {
  return orderTotals(subtotalKobo, discountKobo);
}

export { computeFee };
