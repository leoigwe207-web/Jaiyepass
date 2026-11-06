"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, getOrgMembership } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sanitizeText } from "@/lib/validation";
import { eventInputSchema, ticketTypeInputSchema, promoInputSchema } from "@/lib/validation";
import { nairaToKobo } from "@/lib/money";
import { createRefund } from "@/lib/paystack";
import { sendEmail, refundEmail } from "@/lib/email";
import { formatKobo } from "@/lib/money";
import { getOrgBalance } from "@/lib/host";
import { serverEnv } from "@/lib/env";
import { isOrganizationActive } from "@/lib/organization-status";
import { rateLimit } from "@/lib/rate-limit";
import { lagosLocalToUtcIso } from "@/lib/ticket-sales-time";

export type ActionState = { error?: string; ok?: boolean; id?: string };

type HostRole = "owner" | "admin" | "manager" | "scanner";

/** Verify the caller manages this org; aborts the action otherwise. */
async function requireHostRole(orgId: string, roles: HostRole[] = ["owner", "admin", "manager"]) {
  const user = await requireUser();
  const role = await getOrgMembership(user.id, orgId);
  if (!role || !roles.includes(role)) return null;
  if (!(await isOrganizationActive(orgId))) return null;
  return { user, role, admin: createAdminClient() };
}

async function requireHostForEvent(eventId: string, roles: HostRole[] = ["owner", "admin", "manager"]) {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, organization_id, status, title")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return null;
  const ctx = await requireHostRole(event.organization_id, roles);
  if (!ctx) return null;
  return { ...ctx, event, admin };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── Organization onboarding ─────────────────────────────────────────────────

const orgSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactEmail: z.string().email().max(254),
  contactPhone: z
    .string()
    .trim()
    .regex(/^[+0-9()\s-]{7,20}$/, "Enter a valid phone number.")
    .or(z.literal("")),
  payoutBankName: z.string().trim().max(120).or(z.literal("")),
  payoutAccountNumber: z.string().trim().regex(/^[0-9]{10}$/, "Enter a 10-digit account number.").or(z.literal("")),
  payoutAccountName: z.string().trim().max(120).or(z.literal("")),
});

export async function createOrganizationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const rl = rateLimit(`org-create:${user.id}`, { limit: 3, windowMs: 60 * 60_000 });
  if (!rl.ok) return { error: "Too many attempts — try again later." };

  const parsed = orgSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    payoutBankName: String(formData.get("payoutBankName") ?? ""),
    payoutAccountNumber: String(formData.get("payoutAccountNumber") ?? ""),
    payoutAccountName: String(formData.get("payoutAccountName") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields." };

  const admin = createAdminClient();

  // One org per user in this MVP.
  const { data: existing } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (existing) return { error: "You already belong to an organizer account." };

  const baseSlug = slugify(parsed.data.name) || "organizer";
  let slug = baseSlug;
  for (let i = 2; ; i++) {
    const { data: clash } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (!clash) break;
    slug = `${baseSlug}-${i}`;
  }

  const { data: org, error } = await admin
    .from("organizations")
    .insert({
      name: sanitizeText(parsed.data.name),
      slug,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone || null,
      payout_bank_name: parsed.data.payoutBankName || null,
      payout_account_number: parsed.data.payoutAccountNumber || null,
      payout_account_name: parsed.data.payoutAccountName || null,
      created_by: user.id,
      verification: "verified",
    })
    .select("id")
    .single();

  if (error || !org) {
    console.error("org insert failed", error?.code);
    return { error: "Could not create the organizer account. Try again." };
  }

  const { error: memberErr } = await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });
  if (memberErr) {
    console.error("org owner insert failed", memberErr.code);
    return { error: "Could not set up your account. Contact support." };
  }

  await writeAuditLog({
    actorId: user.id,
    action: "org.created",
    entityType: "organization",
    entityId: org.id,
    metadata: { slug, verification: "verified", approvalMode: "automatic" },
  });

  revalidatePath("/host");
  return { ok: true, id: org.id };
}

// ── Events ──────────────────────────────────────────────────────────────────

async function ensureVenue(
  admin: ReturnType<typeof createAdminClient>,
  name: string,
  address: string,
  cityId: string,
): Promise<string | null> {
  const cleanName = sanitizeText(name);
  const { data: existing } = await admin
    .from("venues")
    .select("id")
    .ilike("name", cleanName)
    .eq("city_id", cityId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: venue } = await admin
    .from("venues")
    .insert({ name: cleanName, address: sanitizeText(address), city_id: cityId })
    .select("id")
    .single();
  return venue?.id ?? null;
}

async function parseEventForm(formData: FormData) {
  return eventInputSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    cityId: String(formData.get("cityId") ?? ""),
    venueName: String(formData.get("venueName") ?? ""),
    venueAddress: String(formData.get("venueAddress") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    doorsOpenAt: String(formData.get("doorsOpenAt") ?? ""),
    ageGuidance: String(formData.get("ageGuidance") ?? ""),
    refundPolicy: String(formData.get("refundPolicy") ?? ""),
  });
}

export async function createEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin", "manager"])
    .maybeSingle();
  if (!membership) return { error: "You don't have permission to create events." };
  if (!(await isOrganizationActive(membership.organization_id))) return { error: "Your organizer account is paused or rejected. Contact support." };

  const rl = rateLimit(`event-create:${user.id}`, { limit: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return { error: "Too many attempts — try again shortly." };

  const parsed = await parseEventForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields." };

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { error: "End time must be after the start time." };
  }
  if (startsAt.getTime() < Date.now() - 6 * 3600_000) {
    return { error: "Start time must be in the future." };
  }

  const venueId = await ensureVenue(admin, parsed.data.venueName, parsed.data.venueAddress, parsed.data.cityId);
  if (!venueId) return { error: "Could not save the venue. Check the details and try again." };

  const baseSlug = slugify(parsed.data.title);
  let slug = baseSlug;
  for (let i = 2; ; i++) {
    const { data: clash } = await admin.from("events").select("id").eq("slug", slug).maybeSingle();
    if (!clash) break;
    slug = `${baseSlug}-${i}`;
  }

  const { data: event, error } = await admin
    .from("events")
    .insert({
      organization_id: membership.organization_id,
      created_by: user.id,
      venue_id: venueId,
      category_id: parsed.data.categoryId || null,
      city_id: parsed.data.cityId,
      slug,
      title: sanitizeText(parsed.data.title),
      tagline: parsed.data.tagline ? sanitizeText(parsed.data.tagline) : null,
      description: sanitizeText(parsed.data.description),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      doors_open_at: parsed.data.doorsOpenAt ? new Date(parsed.data.doorsOpenAt).toISOString() : null,
      age_guidance: parsed.data.ageGuidance ? sanitizeText(parsed.data.ageGuidance) : null,
      refund_policy: parsed.data.refundPolicy
        ? sanitizeText(parsed.data.refundPolicy)
        : "Refunds are available up to 48 hours before the event starts, unless otherwise stated by the host.",
      status: "draft",
      is_demo: false,
    })
    .select("id")
    .single();

  if (error || !event) {
    console.error("event insert failed", error?.code);
    return { error: "Could not create the event. Try again." };
  }

  await writeAuditLog({
    actorId: user.id,
    action: "event.created",
    entityType: "event",
    entityId: event.id,
    metadata: { slug },
  });

  revalidatePath("/host/events");
  redirect(`/host/events/${event.id}`);
}

export async function updateEventAction(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireHostForEvent(eventId);
  if (!ctx) return { error: "You don't have permission to edit this event." };

  const parsed = await parseEventForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form fields." };

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { error: "End time must be after the start time." };
  }

  const venueId = await ensureVenue(ctx.admin, parsed.data.venueName, parsed.data.venueAddress, parsed.data.cityId);

  const { error } = await ctx.admin
    .from("events")
    .update({
      venue_id: venueId,
      category_id: parsed.data.categoryId || null,
      city_id: parsed.data.cityId,
      title: sanitizeText(parsed.data.title),
      tagline: parsed.data.tagline ? sanitizeText(parsed.data.tagline) : null,
      description: sanitizeText(parsed.data.description),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      doors_open_at: parsed.data.doorsOpenAt ? new Date(parsed.data.doorsOpenAt).toISOString() : null,
      age_guidance: parsed.data.ageGuidance ? sanitizeText(parsed.data.ageGuidance) : null,
      refund_policy: parsed.data.refundPolicy ? sanitizeText(parsed.data.refundPolicy) : undefined,
      // A substantive edit on a published event sends it back to review.
      status: ctx.event.status === "published" ? "pending_review" : ctx.event.status,
    })
    .eq("id", eventId);

  if (error) {
    console.error("event update failed", error.code);
    return { error: "Could not save the event. Try again." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "event.updated",
    entityType: "event",
    entityId: eventId,
    metadata: { previousStatus: ctx.event.status },
  });

  revalidatePath(`/host/events/${eventId}`);
  revalidatePath("/host/events");
  return { ok: true };
}

export async function submitEventForReviewAction(eventId: string): Promise<ActionState> {
  const ctx = await requireHostForEvent(eventId);
  if (!ctx) return { error: "You don't have permission to submit this event." };

  const { count } = await ctx.admin
    .from("ticket_types")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (!count) return { error: "Add at least one ticket type before submitting for review." };

  const { error } = await ctx.admin
    .from("events")
    .update({ status: "pending_review" })
    .eq("id", eventId)
    .in("status", ["draft", "rejected"]);

  if (error) {
    console.error("submit for review failed", error.code);
    return { error: "Could not submit the event." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "event.submitted_for_review",
    entityType: "event",
    entityId: eventId,
  });

  revalidatePath(`/host/events/${eventId}`);
  return { ok: true };
}

export async function cancelEventAction(eventId: string): Promise<ActionState> {
  const ctx = await requireHostForEvent(eventId);
  if (!ctx) return { error: "You don't have permission to cancel this event." };

  const { error } = await ctx.admin
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId)
    .in("status", ["published", "approved", "pending_review"]);

  if (error) {
    console.error("cancel event failed", error.code);
    return { error: "Could not cancel the event." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "event.cancelled",
    entityType: "event",
    entityId: eventId,
  });

  revalidatePath(`/host/events/${eventId}`);
  return { ok: true };
}

// ── Ticket types ────────────────────────────────────────────────────────────

export async function addTicketTypeAction(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireHostForEvent(eventId);
  if (!ctx) return { error: "You don't have permission to manage tickets." };

  const parsed = ticketTypeInputSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    priceKobo: nairaToKobo(String(formData.get("priceNaira") ?? "0")),
    quantity: Number(formData.get("quantity") ?? 0),
    perOrderLimit: Number(formData.get("perOrderLimit") ?? 10),
    salesStartAt: String(formData.get("salesStartAt") ?? ""),
    salesEndAt: String(formData.get("salesEndAt") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the ticket details." };

  // HTML datetime-local values represent the organizer's Lagos wall clock time.
  const startIso = parsed.data.salesStartAt ? lagosLocalToUtcIso(parsed.data.salesStartAt) : null;
  const endIso = parsed.data.salesEndAt ? lagosLocalToUtcIso(parsed.data.salesEndAt) : null;
  if (parsed.data.salesStartAt && !startIso) return { error: "Enter a valid sales start in Lagos time (WAT)." };
  if (parsed.data.salesEndAt && !endIso) return { error: "Enter a valid sales end in Lagos time (WAT)." };
  if (startIso && endIso && Date.parse(endIso) <= Date.parse(startIso)) {
    return { error: "Sales end must be later than sales start." };
  }

  const { data, error } = await ctx.admin
    .from("ticket_types")
    .insert({
      event_id: eventId,
      name: sanitizeText(parsed.data.name),
      description: parsed.data.description ? sanitizeText(parsed.data.description) : null,
      price_kobo: parsed.data.priceKobo,
      quantity: parsed.data.quantity,
      per_order_limit: parsed.data.perOrderLimit,
      sales_start_at: startIso,
      sales_end_at: endIso,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("ticket type insert failed", error?.code);
    return { error: "Could not add the ticket type. Try again." };
  }

  // Free ticket types mark the event free in discovery.
  if (parsed.data.priceKobo === 0) {
    await ctx.admin.from("events").update({ is_free: true }).eq("id", eventId);
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "ticket_type.created",
    entityType: "ticket_type",
    entityId: data.id,
    metadata: { eventId, priceKobo: parsed.data.priceKobo },
  });

  revalidatePath(`/host/events/${eventId}`);
  return { ok: true, id: data.id };
}

export async function setTicketTypeStatusAction(
  ticketTypeId: string,
  status: "active" | "paused" | "closed",
): Promise<ActionState> {
  const admin = createAdminClient();
  const { data: tt } = await admin
    .from("ticket_types")
    .select("id, event_id")
    .eq("id", ticketTypeId)
    .maybeSingle();
  if (!tt) return { error: "Ticket type not found." };

  const ctx = await requireHostForEvent(tt.event_id);
  if (!ctx) return { error: "You don't have permission to manage tickets." };

  const { error } = await ctx.admin
    .from("ticket_types")
    .update({ status })
    .eq("id", ticketTypeId);

  if (error) {
    console.error("ticket type update failed", error.code);
    return { error: "Could not update the ticket type." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "ticket_type.status_changed",
    entityType: "ticket_type",
    entityId: ticketTypeId,
    metadata: { status },
  });

  revalidatePath(`/host/events/${tt.event_id}`);
  return { ok: true };
}

// ── Promo codes ─────────────────────────────────────────────────────────────

export async function createPromoAction(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireHostForEvent(eventId);
  if (!ctx) return { error: "You don't have permission to manage promos." };

  const rawValue = String(formData.get("value") ?? "0");
  const parsed = promoInputSchema.safeParse({
    eventId,
    code: String(formData.get("code") ?? ""),
    kind: String(formData.get("kind") ?? "percentage"),
    value: String(formData.get("kind")) === "fixed" ? nairaToKobo(rawValue) : Number(rawValue),
    maxRedemptions: formData.get("maxRedemptions") ? Number(formData.get("maxRedemptions")) : undefined,
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the promo details." };

  if (parsed.data.kind === "percentage" && parsed.data.value > 100) {
    return { error: "Percentage discounts cannot exceed 100%." };
  }

  const { error } = await ctx.admin.from("promo_codes").insert({
    organization_id: ctx.event.organization_id,
    event_id: eventId,
    code: parsed.data.code.toUpperCase(),
    kind: parsed.data.kind,
    value: parsed.data.value,
    max_redemptions: parsed.data.maxRedemptions ?? null,
    starts_at: parsed.data.startsAt ? new Date(parsed.data.startsAt).toISOString() : null,
    ends_at: parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : null,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") return { error: "That code already exists for this organizer." };
    console.error("promo insert failed", error.code);
    return { error: "Could not create the promo code. Try again." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "promo.created",
    entityType: "promo_code",
    entityId: eventId,
    metadata: { code: parsed.data.code.toUpperCase(), kind: parsed.data.kind },
  });

  revalidatePath(`/host/events/${eventId}`);
  return { ok: true };
}

export async function togglePromoAction(promoId: string): Promise<ActionState> {
  const admin = createAdminClient();
  const { data: promo } = await admin
    .from("promo_codes")
    .select("id, organization_id, is_active")
    .eq("id", promoId)
    .maybeSingle();
  if (!promo) return { error: "Promo not found." };

  const ctx = await requireHostRole(promo.organization_id);
  if (!ctx) return { error: "You don't have permission to manage promos." };

  await ctx.admin.from("promo_codes").update({ is_active: !promo.is_active }).eq("id", promoId);
  revalidatePath("/host");
  return { ok: true };
}

// ── Scanners ────────────────────────────────────────────────────────────────

export async function addScannerAction(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireHostForEvent(eventId);
  if (!ctx) return { error: "You don't have permission to manage scanners." };

  const rl = rateLimit(`scanner-add:${ctx.user.id}`, { limit: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) return { error: "Too many attempts — try again shortly." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };

  const { data: profile } = await ctx.admin
    .from("profiles")
    .select("id, full_name")
    .ilike("email", email)
    .maybeSingle();
  if (!profile) {
    return { error: "No JaiyePass account with that email — ask them to sign up first." };
  }

  const { error } = await ctx.admin.from("event_scanners").insert({
    event_id: eventId,
    user_id: profile.id,
    assigned_by: ctx.user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "That person is already a scanner for this event." };
    console.error("scanner insert failed", error.code);
    return { error: "Could not add the scanner. Try again." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "scanner.assigned",
    entityType: "event_scanner",
    entityId: eventId,
    metadata: { scannerUserId: profile.id },
  });

  revalidatePath(`/host/events/${eventId}`);
  return { ok: true };
}

export async function removeScannerAction(scannerId: string): Promise<ActionState> {
  const admin = createAdminClient();
  const { data: scanner } = await admin
    .from("event_scanners")
    .select("id, event_id, user_id")
    .eq("id", scannerId)
    .maybeSingle();
  if (!scanner) return { error: "Scanner not found." };

  const ctx = await requireHostForEvent(scanner.event_id);
  if (!ctx) return { error: "You don't have permission to manage scanners." };

  await ctx.admin.from("event_scanners").delete().eq("id", scannerId);

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "scanner.removed",
    entityType: "event_scanner",
    entityId: scanner.event_id,
    metadata: { scannerUserId: scanner.user_id },
  });

  revalidatePath(`/host/events/${scanner.event_id}`);
  return { ok: true };
}

// ── Refunds ─────────────────────────────────────────────────────────────────

export async function approveRefundAction(refundId: string): Promise<ActionState> {
  const admin = createAdminClient();
  const { data: refund } = await admin
    .from("refunds")
    .select(
      "id, order_id, amount_kobo, status, status_history, order:orders!inner(id, status, paystack_reference, user_id, event_id, events(organization_id, title), profiles(email))",
    )
    .eq("id", refundId)
    .maybeSingle();
  if (!refund) return { error: "Refund not found." };

  const order = refund.order as unknown as {
    status: string;
    paystack_reference: string | null;
    profiles: { email: string } | null;
    events: { organization_id: string; title: string } | null;
  };

  const ctx = await requireHostRole(order.events?.organization_id ?? "", ["owner", "admin"]);
  if (!ctx) return { error: "Only owners/admins can approve refunds." };
  if (refund.status !== "requested") return { error: "This refund is not awaiting review." };
  if (order.status !== "paid" || !order.paystack_reference) {
    return { error: "This order cannot be refunded automatically." };
  }

  const env = serverEnv();
  let providerRef: string | null = null;

  if (env.paystackSecret) {
    const result = await createRefund({
      transactionReference: order.paystack_reference,
      amountKobo: refund.amount_kobo,
    });
    if (!result.ok) {
      console.error("paystack refund failed", result.error);
      return { error: `Provider refused the refund: ${result.error ?? "unknown error"}` };
    }
    providerRef = result.refundId ?? null;
  }

  // In test mode there is no provider call: process directly, clearly logged.
  const processedAt = new Date().toISOString();
  const { error } = await admin
    .from("refunds")
    .update({
      status: "processed",
      processed_by: ctx.user.id,
      provider_reference: providerRef,
      status_history: [
        ...((refund.status_history as never[]) ?? []),
        { at: processedAt, to: "processed", via: env.paystackSecret ? "paystack" : "test-mode" },
      ] as never,
    })
    .eq("id", refundId);

  if (error) {
    console.error("refund update failed", error.code);
    return { error: "Could not record the refund. Contact support." };
  }

  await admin.from("orders").update({ status: "refunded" }).eq("id", refund.order_id);
  await admin
    .from("tickets")
    .update({ status: "refunded", refunded_at: processedAt })
    .eq("order_id", refund.order_id);

  if (order.profiles?.email) {
    await sendEmail(
      refundEmail({
        to: order.profiles.email,
        eventTitle: order.events?.title ?? "your order",
        amountFormatted: formatKobo(refund.amount_kobo, { hideZeroDecimals: true }),
      }),
    );
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "refund.approved",
    entityType: "refund",
    entityId: refundId,
    metadata: { orderId: refund.order_id, amountKobo: refund.amount_kobo, provider: !!env.paystackSecret },
  });

  revalidatePath("/host");
  return { ok: true };
}

export async function rejectRefundAction(refundId: string): Promise<ActionState> {
  const admin = createAdminClient();
  const { data: refund } = await admin
    .from("refunds")
    .select("id, status, status_history, order:orders!inner(events(organization_id))")
    .eq("id", refundId)
    .maybeSingle();
  if (!refund) return { error: "Refund not found." };

  const orgId = (refund.order as unknown as { events: { organization_id: string } | null })?.events
    ?.organization_id;
  const ctx = await requireHostRole(orgId ?? "", ["owner", "admin"]);
  if (!ctx) return { error: "Only owners/admins can reject refunds." };
  if (refund.status !== "requested") return { error: "This refund is not awaiting review." };

  await admin
    .from("refunds")
    .update({
      status: "rejected",
      processed_by: ctx.user.id,
      status_history: [
        ...((refund.status_history as never[]) ?? []),
        { at: new Date().toISOString(), to: "rejected", via: "host" },
      ] as never,
    })
    .eq("id", refundId);

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "refund.rejected",
    entityType: "refund",
    entityId: refundId,
  });

  revalidatePath("/host");
  return { ok: true };
}

// ── Payouts ─────────────────────────────────────────────────────────────────

export async function requestPayoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!membership) return { error: "Only owners/admins can request payouts." };
  if (!(await isOrganizationActive(membership.organization_id))) return { error: "This organizer account is paused or rejected. Payout requests are disabled." };

  const rl = rateLimit(`payout:${user.id}`, { limit: 5, windowMs: 60 * 60_000 });
  if (!rl.ok) return { error: "Too many payout requests — try again later." };

  const amountKobo = nairaToKobo(String(formData.get("amountNaira") ?? "0"));
  if (amountKobo <= 0) return { error: "Enter an amount to withdraw." };

  const balance = await getOrgBalance(membership.organization_id);
  if (!balance.ledgerReady) {
    return { error: "Payout requests are not enabled until financial reconciliation is configured." };
  }
  if (amountKobo > balance.availableKobo) {
    return {
      error: `That is more than your available balance of ${formatKobo(balance.availableKobo, { hideZeroDecimals: true })}.`,
    };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("payout_account_name, payout_account_number, payout_bank_name")
    .eq("id", membership.organization_id)
    .maybeSingle();

  if (!org?.payout_account_number || !org?.payout_bank_name) {
    return { error: "Add your bank payout details to your organizer profile first." };
  }

  // The RPC locks the organization row and checks settled ledger funds +
  // existing reservations in ONE database transaction. Two simultaneous
  // requests can never spend the same available balance.
  const { data: payoutId, error } = await admin.rpc("request_organizer_payout", {
    p_org_id: membership.organization_id,
    p_requester: user.id,
    p_amount_kobo: amountKobo,
  });

  if (error) {
    console.error("payout insert failed", error.code);
    return { error: "Could not request the payout. Try again." };
  }

  await writeAuditLog({
    actorId: user.id,
    action: "payout.requested",
    entityType: "payout",
    entityId: String(payoutId),
    metadata: { organizationId: membership.organization_id, amountKobo },
  });

  revalidatePath("/host/payouts");
  return { ok: true };
}
