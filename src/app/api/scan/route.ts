import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isEventScannerFor, getOrgMembership } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPayloadSignature, hashPayload } from "@/lib/ticket-token";
import { serverEnv } from "@/lib/env";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { getDemoUser } from "@/lib/demo";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  payload: z.string().trim().min(10).max(128),
  eventId: z.string().uuid(),
});

/**
 * Validate a scanned ticket for an event. Order of checks:
 *   1. signed-in user is a scanner for THIS event (or host/admin)
 *   2. QR payload signature (HMAC with server pepper)
 *   3. atomic claim (claim_check_in) — double-entry safe even with
 *      two scanners hitting the same code at once.
 *
 * The raw QR payload is never logged or stored; only its sha256 hash is
 * matched against tickets.token_hash.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to scan." }, { status: 401 });

  const rl = rateLimit(`scan:${clientIp(req)}`, RATE_LIMITS.scan);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Slow down — too many scans." },
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid scan data." }, { status: 400 });

  const { payload, eventId } = parsed.data;

  // Preview demo mode (fail-closed elsewhere): simulate verdicts for the demo
  // scanner/host/admin roles without touching any database. Nothing is stored.
  const demoUser = await getDemoUser();
  if (demoUser) {
    if (demoUser.role === "attendee") {
      return NextResponse.json({ error: "This demo account is not assigned to scan." }, { status: 403 });
    }
    return NextResponse.json({ ...simulateDemoScan(payload), demo: true, eventId });
  }

  const admin = createAdminClient();

  const authorized =
    user.role === "admin" ||
    (await isEventScannerFor(user.id, eventId)) ||
    ((await getMembershipOrgRole(admin, user.id, eventId)) !== null);
  if (!authorized) {
    await writeAuditLog({
      actorId: user.id,
      action: "scan.denied_not_assigned",
      entityType: "event",
      entityId: eventId,
    });
    return NextResponse.json({ error: "You are not assigned to scan for this event." }, { status: 403 });
  }

  const pepper = serverEnv().ticketPepper;
  if (!verifyPayloadSignature(payload, pepper)) {
    return NextResponse.json({
      result: "invalid",
      message: "Not a valid JaiyePass ticket.",
    });
  }

  const tokenHash = hashPayload(payload);
  const { data, error } = await admin.rpc("claim_check_in", {
    p_token_hash: tokenHash,
    p_event_id: eventId,
    p_scanner_id: user.id,
  });

  if (error) {
    console.error("claim_check_in failed", error.message);
    return NextResponse.json({ error: "Could not validate the ticket. Retry." }, { status: 500 });
  }

  const result = (data as { result?: string; ticket_id?: string | null })?.result ?? "invalid";
  const ticketId = (data as { ticket_id?: string | null })?.ticket_id ?? null;

  // Friendly context for the scanner (first name only — never full contact info).
  let ticket: { ticketType: string; attendeeName: string; usedAt: string | null } | null = null;
  if (ticketId) {
    const { data: row } = await admin
      .from("tickets")
      .select("used_at, ticket_types(name), user:profiles(full_name)")
      .eq("id", ticketId)
      .maybeSingle();
    if (row) {
      const profile = row.user as unknown as { full_name: string | null } | null;
      const tt = row.ticket_types as unknown as { name: string } | null;
      ticket = {
        ticketType: tt?.name ?? "Ticket",
        attendeeName: profile?.full_name?.trim().split(/\s+/)[0] ?? "Guest",
        usedAt: (row.used_at as string | null) ?? null,
      };
    }
  }

  const messages: Record<string, string> = {
    valid: "Valid — entry granted",
    already_used: ticket?.usedAt
      ? `Already used at ${new Date(ticket.usedAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`
      : "Already used",
    wrong_event: "This ticket is for a different event",
    cancelled: "Ticket cancelled",
    refunded: "Ticket refunded",
    invalid: "Not a valid JaiyePass ticket",
  };

  return NextResponse.json({ result, message: messages[result] ?? "Invalid ticket", ticket });
}

/** Deterministic simulated verdicts for preview demo scans — never persisted. */
function simulateDemoScan(payload: string): {
  result: string;
  message: string;
  ticket: { ticketType: string; attendeeName: string; usedAt: string | null } | null;
} {
  if (payload.includes("preview-used")) {
    return {
      result: "already_used",
      message: "Already used (demo — nothing was recorded)",
      ticket: {
        ticketType: "General Admission (demo)",
        attendeeName: "Demo Guest",
        usedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    };
  }
  if (payload.includes("preview-wrong-event")) {
    return {
      result: "wrong_event",
      message: "This ticket is for a different event (demo)",
      ticket: null,
    };
  }
  if (!payload.startsWith("demo.")) {
    return { result: "invalid", message: "Not a valid JaiyePass ticket (demo)", ticket: null };
  }
  return {
    result: "valid",
    message: "Valid — entry granted (demo, not recorded)",
    ticket: { ticketType: "General Admission (demo)", attendeeName: "Demo Guest", usedAt: null },
  };
}

/** Host/admin members of the event's org can also scan (manual fallback). */
async function getMembershipOrgRole(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  eventId: string,
): Promise<string | null> {
  const { data: event } = await admin
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return null;
  return getOrgMembership(userId, event.organization_id);
}
