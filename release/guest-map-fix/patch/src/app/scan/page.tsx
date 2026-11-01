import type { Metadata } from "next";
import { requireUser, getManagedOrgId, isEventScannerFor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, relativeDeadline } from "@/lib/format";
import { Scanner } from "@/components/scan/scanner";

export const metadata: Metadata = { title: "Scan tickets" };
export const dynamic = "force-dynamic";

/**
 * Door scanner page (mobile-first). Only shows events the signed-in user is
 * assigned to scan — or hosts/admins for their own orgs.
 */
export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {

  const user = await requireUser();
  const admin = createAdminClient();
  const { event: selected } = await searchParams;

  // Events this user may scan: explicit assignments + their managed orgs.
  const [{ data: assigned }, orgId] = await Promise.all([
    admin.from("event_scanners").select("event_id").eq("user_id", user.id),
    getManagedOrgId(user.id),
  ]);

  const assignedIds = (assigned ?? []).map((a) => a.event_id);

  let events: { id: string; title: string; starts_at: string }[] = [];

  const baseSelect = "id, title, starts_at, status, ends_at";
  const upcoming = async (ids: string[]) => {
    if (ids.length === 0) return [] as typeof events;
    const { data } = await admin
      .from("events")
      .select(baseSelect)
      .in("id", ids)
      .in("status", ["published", "approved", "pending_review"])
      .order("starts_at", { ascending: true });
    return (data ?? []) as typeof events;
  };

  if (user.role === "admin") {
    const { data } = await admin
      .from("events")
      .select(baseSelect)
      .in("status", ["published", "approved"])
      .gte("starts_at", new Date(Date.now() - 36 * 3600_000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(40);
    events = (data ?? []) as typeof events;
  } else {
    const orgEvents = orgId
      ? await admin
          .from("events")
          .select(baseSelect)
          .eq("organization_id", orgId)
          .in("status", ["published", "approved", "pending_review"])
          .order("starts_at", { ascending: true })
          .limit(30)
      : { data: [] };

    const seen = new Set<string>();
    events = [...(await upcoming(assignedIds)), ...((orgEvents.data ?? []) as typeof events)]
      .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  }

  const activeEventId = selected && events.some((e) => e.id === selected) ? selected : (events[0]?.id ?? null);

  // Recent check-in log for the chosen event.
  let recent: {
    id: string;
    result: string;
    scanned_at: string;
    ticket: { ticket_types: { name: string } | null; profiles: { full_name: string | null } | null } | null;
  }[] = [];

  if (activeEventId) {
    const allowed =
      user.role === "admin" || orgId !== null || (await isEventScannerFor(user.id, activeEventId));
    if (allowed) {
      const { data } = await admin
        .from("check_ins")
        .select("id, result, scanned_at, ticket:tickets(ticket_types(name), profiles(full_name))")
        .eq("event_id", activeEventId)
        .order("scanned_at", { ascending: false })
        .limit(25);
      recent = (data ?? []) as unknown as typeof recent;
    }
  }

  const admittedCount = recent.filter((r) => r.result === "valid").length;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-neon-deep">Door staff</p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Scan tickets</h1>
        {activeEventId && (
          <p className="mt-1 text-sm text-ink-soft">
            {events.find((e) => e.id === activeEventId) &&
              `${formatDateTime(events.find((e) => e.id === activeEventId)!.starts_at)} · starts ${relativeDeadline(
                events.find((e) => e.id === activeEventId)!.starts_at,
              )}`}
          </p>
        )}
      </section>

      <Scanner
        events={events.map((e) => ({ id: e.id, title: e.title }))}
        initialEventId={activeEventId}
        canUseCamera={true}
      />

      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-ink-faint">
          Recent scans {activeEventId && `· ${admittedCount} admitted shown`}
        </h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">No scans recorded yet for this event.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-card border border-line bg-white">
            {recent.map((r) => {
              const ticket = r.ticket as {
                ticket_types: { name: string } | null;
                profiles: { full_name: string | null } | null;
              } | null;
              const ok = r.result === "valid";
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {ticket?.profiles?.full_name?.split(" ")[0] ?? "Ticket"} · {ticket?.ticket_types?.name ?? "—"}
                    </p>
                    <p className="text-xs text-ink-faint">{formatDateTime(r.scanned_at)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-card border px-2 py-0.5 text-xs font-bold ${
                      ok
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-warning/40 bg-warning/10 text-warning"
                    }`}
                  >
                    {r.result.replace("_", " ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
