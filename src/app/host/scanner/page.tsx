import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, getManagedOrgId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Scanner } from "@/components/scan/scanner";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Ticket scanner" };
export const dynamic = "force-dynamic";

export default async function OrganizerScannerPage({
  searchParams,
}: { searchParams: Promise<{ event?: string }> }) {
  const user = await requireUser("/host/scanner");
  const orgId = await getManagedOrgId(user.id);
  if (!orgId) redirect("/host");
  const admin = createAdminClient();
  const { data, error } = await admin.from("events")
    .select("id, title, starts_at")
    .eq("organization_id", orgId)
    .in("status", ["published", "approved", "pending_review"])
    .order("starts_at", { ascending: true })
    .limit(100);
  const events = data ?? [];
  const requested = (await searchParams).event;
  const active = events.find(e => e.id === requested) ?? events[0] ?? null;
  const { data: recent } = active ? await admin.from("check_ins")
    .select("id, result, scanned_at")
    .eq("event_id", active.id)
    .order("scanned_at", { ascending: false })
    .limit(15) : { data: [] };
  return (
    <div className="space-y-7 px-4 pb-10 sm:px-0">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-neon-deep">Organizer tools</p>
        <h1 className="mt-2 text-3xl font-extrabold">Ticket scanner</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">Scan your event's QR tickets using your phone camera, or paste a ticket code. Only tickets for events you manage can be admitted.</p>
      </header>
      {error ? <p role="alert" className="rounded-xl border border-danger/30 p-5 text-danger">Could not load your events.</p> : events.length === 0 ? (
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="text-lg font-bold">No events ready for scanning</h2>
          <p className="mt-2 text-sm text-ink-soft">Create an event and get it approved before you begin checking in guests.</p>
          <Link href="/host/events" className="mt-5 inline-flex rounded-xl bg-neon-deep px-4 py-3 text-sm font-bold text-white">My events</Link>
        </section>
      ) : (
        <>
          <div className="max-w-xl rounded-xl border border-line bg-white p-5 sm:p-6">
            <Scanner events={events} initialEventId={active?.id ?? null} canUseCamera={true} />
          </div>
          <section className="max-w-xl">
            <h2 className="text-lg font-bold">Recent scans</h2>
            <p className="mt-1 text-xs text-ink-soft">Refresh to update the list for {active?.title ?? "this event"}. Rejected attempts are recorded too.</p>
            {!recent?.length ? <p className="mt-4 text-sm text-ink-soft">No tickets scanned yet.</p> : (
              <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                {recent.map(scan => (
                  <li key={scan.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                    <span className="font-semibold capitalize">{scan.result.replaceAll("_", " ")}</span>
                    <span className="text-xs text-ink-soft">{formatDateTime(scan.scanned_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
