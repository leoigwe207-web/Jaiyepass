"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getSessionUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sanitizeText } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export type AdminActionState = { error?: string; ok?: boolean };

async function adminCtx() {
  const user = await requireAdmin();
  const rl = rateLimit(`admin:${user.id}`, { limit: 120, windowMs: 60_000 });
  if (!rl.ok) return null;
  return { user, admin: createAdminClient() };
}

const reviewSchema = z.object({
  eventId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

/** Approve/reject an event in the review queue. */
export async function reviewEventAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await adminCtx();
  if (!ctx) return { error: "Too many attempts or not authorized." };

  const parsed = reviewSchema.safeParse({
    eventId: String(formData.get("eventId") ?? ""),
    decision: String(formData.get("decision") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { error: "Invalid review submission." };

  const status = parsed.data.decision === "approve" ? "published" : "rejected";
  const { data: event } = await ctx.admin
    .from("events")
    .select("id, status, title, org:organizations(verification)")
    .eq("id", parsed.data.eventId)
    .maybeSingle();
  if (!event) return { error: "Event not found." };
  if (event.status !== "pending_review" && event.status !== "approved") {
    return { error: "That event is not awaiting review." };
  }

  // Only verified organizers may go live; keep review workflow explicit.
  const org = event.org as unknown as { verification: string } | null;
  if (status === "published" && org?.verification !== "verified") {
    return { error: "Verify this organizer before publishing their event." };
  }

  const { error } = await ctx.admin
    .from("events")
    .update({
      status,
      reviewed_by: ctx.user.id,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.data.note ? sanitizeText(parsed.data.note) : null,
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    })
    .eq("id", parsed.data.eventId);

  if (error) {
    console.error("review update failed", error.code);
    return { error: "Could not record the decision." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: `event.${status === "published" ? "approved" : "rejected"}`,
    entityType: "event",
    entityId: event.id,
    metadata: { title: event.title },
  });

  revalidatePath("/admin");
  revalidatePath(`/host/events/${event.id}`);
  return { ok: true };
}

const roleSchema = z.object({ userId: z.string().uuid(), role: z.enum(["attendee", "admin"]) });

export async function setUserRoleAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await adminCtx();
  if (!ctx) return { error: "Too many attempts or not authorized." };

  const parsed = roleSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) return { error: "Invalid role change." };

  if (parsed.data.userId === ctx.user.id && parsed.data.role !== "admin") {
    return { error: "You cannot remove your own administrator access." };
  }

  const { error } = await ctx.admin.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.userId);
  if (error) {
    console.error("role update failed", error.code);
    return { error: "Could not change the role." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "user.role_changed",
    entityType: "profile",
    entityId: parsed.data.userId,
    metadata: { role: parsed.data.role },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

const verificationSchema = z.object({
  orgId: z.string().uuid(),
  decision: z.enum(["verified", "rejected", "pending"]),
  note: z.string().trim().max(400).optional().or(z.literal("")),
});

export async function setOrgVerificationAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await adminCtx();
  if (!ctx) return { error: "Too many attempts or not authorized." };

  const parsed = verificationSchema.safeParse({
    orgId: String(formData.get("orgId") ?? ""),
    decision: String(formData.get("decision") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { error: "Invalid verification change." };

  const { error } = await ctx.admin
    .from("organizations")
    .update({
      verification: parsed.data.decision,
      verification_note: parsed.data.note ? sanitizeText(parsed.data.note) : null,
    })
    .eq("id", parsed.data.orgId);

  if (error) {
    console.error("verification update failed", error.code);
    return { error: "Could not update the organizer." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "org.verification_changed",
    entityType: "organization",
    entityId: parsed.data.orgId,
    metadata: { verification: parsed.data.decision },
  });

  revalidatePath("/admin/hosts");
  return { ok: true };
}

const payoutSchema = z.object({
  payoutId: z.string().uuid(),
  status: z.enum(["approved", "processing", "paid", "cancelled", "on_hold"]),
});

export async function setPayoutStatusAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await adminCtx();
  if (!ctx) return { error: "Too many attempts or not authorized." };

  const parsed = payoutSchema.safeParse({
    payoutId: String(formData.get("payoutId") ?? ""),
    status: String(formData.get("status") ?? ""),
  });
  if (!parsed.success) return { error: "Invalid payout status." };

  const { data: payout } = await ctx.admin
    .from("payouts")
    .select("id, status, status_history")
    .eq("id", parsed.data.payoutId)
    .maybeSingle();
  if (!payout) return { error: "Payout not found." };

  const { error } = await ctx.admin
    .from("payouts")
    .update({
      status: parsed.data.status,
      reviewed_by: ctx.user.id,
      status_history: [
        ...((payout.status_history as never[]) ?? []),
        { at: new Date().toISOString(), to: parsed.data.status, via: "admin" },
      ] as never,
    })
    .eq("id", payout.id);

  if (error) {
    console.error("payout update failed", error.code);
    return { error: "Could not update the payout." };
  }

  await writeAuditLog({
    actorId: ctx.user.id,
    action: "payout.status_changed",
    entityType: "payout",
    entityId: payout.id,
    metadata: { status: parsed.data.status },
  });

  revalidatePath("/admin/payouts");
  return { ok: true };
}

const reportSchemaInput = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["resolve", "dismiss", "hide"]),
});

export async function handleReportAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await adminCtx();
  if (!ctx) return { error: "Too many attempts or not authorized." };

  const parsed = reportSchemaInput.safeParse({
    reportId: String(formData.get("reportId") ?? ""),
    action: String(formData.get("action") ?? ""),
  });
  if (!parsed.success) return { error: "Invalid report action." };

  const { data: report } = await ctx.admin
    .from("event_reports")
    .select("id, event_id, status")
    .eq("id", parsed.data.reportId)
    .maybeSingle();
  if (!report) return { error: "Report not found." };

  if (parsed.data.action === "hide") {
    // Hide the reported listing while keeping the audit trail intact.
    await ctx.admin.from("events").update({ status: "hidden" }).eq("id", report.event_id);
    await ctx.admin
      .from("event_reports")
      .update({
        status: "reviewing",
        resolved_by: ctx.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", report.id);

    await writeAuditLog({
      actorId: ctx.user.id,
      action: "event.hidden",
      entityType: "event",
      entityId: report.event_id,
      metadata: { reportId: report.id },
    });
  } else {
    const status = parsed.data.action === "resolve" ? "resolved" : "dismissed";
    await ctx.admin
      .from("event_reports")
      .update({
        status,
        resolved_by: ctx.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", report.id);

    await writeAuditLog({
      actorId: ctx.user.id,
      action: `report.${status}`,
      entityType: "event_report",
      entityId: report.id,
      metadata: { eventId: report.event_id },
    });
  }

  revalidatePath("/admin/reports");
  return { ok: true };
}

/** Toggle whether an event is featured on the homepage. */
export async function toggleFeaturedAction(eventId: string): Promise<AdminActionState> {
  const ctx = await adminCtx();
  if (!ctx) return { error: "Too many attempts or not authorized." };

  const { data: event } = await ctx.admin
    .from("events")
    .select("id, featured")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: "Event not found." };

  await ctx.admin.from("events").update({ featured: !event.featured }).eq("id", eventId);
  await writeAuditLog({
    actorId: ctx.user.id,
    action: "event.feature_toggled",
    entityType: "event",
    entityId: eventId,
    metadata: { featured: !event.featured },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

/** Current admin identity helper used by client error paths. */
export async function getAdminEmail(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.email ?? null;
}


/** Retry a failed email only for a verified paid order. */
export async function retryTicketEmailAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const ctx = await adminCtx();
  if (!ctx) return { error: "Not authorized or too many attempts." };
  const orderId = String(formData.get("orderId") ?? "");
  if (!z.string().uuid().safeParse(orderId).success) return { error: "Invalid order." };
  const { data: delivery } = await ctx.admin.from("ticket_email_deliveries")
    .select("order_id, status").eq("order_id", orderId).maybeSingle();
  if (!delivery || delivery.status !== "failed") return { error: "Only failed email attempts can be retried." };
  const { deliverReceipt } = await import("@/lib/checkout");
  await deliverReceipt(orderId);
  await writeAuditLog({ actorId: ctx.user.id, action: "ticket_email.retry_requested", entityType: "order", entityId: orderId });
  revalidatePath("/admin/emails");
  return { ok: true };
}
