import type { Metadata } from "next";
import Link from "next/link";
import { getHostContext } from "@/lib/host";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Events" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-paper-dim text-ink-soft border-line" },
  pending_review: { label: "In review", cls: "bg-warning/10 text-warning border-warning/30" },
  approved: { label: "Approved", cls: "bg-success/10 text-success border-success/30" },
  published: { label: "Live", cls: "bg-success/10 text-success border-success/30" },
  rejected: { label: "Rejected", cls: "bg-danger/10 text-danger border-danger/30" },
  cancelled: { label: "Cancelled", cls: "bg-paper-dim text-ink-faint border-line" },
  hidden: { label: "Hidden", cls: "bg-paper-dim text-ink-faint border-line" },
};

export default async function HostEventsPage() {
  const { orgId } = await getHostContext();

  if (!orgId) {
    return (
      <p className="text-sm text-ink-soft">
        Set up your organizer account on the{" "}
        <Link href="/host" className="font-semibold text-neon-deep underline underline-offset-2">
          overview page
        </Link>{" "}
        first.
      </p>
    );
  }

  const admin = createAdminClient();
  const { data: events } = await admin
    .from("events")
    .select(
      `id, title, slug, status, starts_at, is_demo, featured,
       ticket_types(price_kobo, quantity, sold_count, status)`,
    )
    .eq("organization_id", orgId)
    .eq("is_demo", false)
    .order("starts_at", { ascending: false });

  const rows = (events ?? []).map((e) => {
    const active = (e.ticket_types ?? []).filter((t) => t.status !== "closed");
    const sold = (e.ticket_types ?? []).reduce((sum, t) => sum + t.sold_count, 0);
    const gross = (e.ticket_types ?? []).reduce((sum, t) => sum + t.price_kobo * t.sold_count, 0);
    const prices = active.map((t) => t.price_kobo).filter((p) => p > 0);
    return { ...e, sold, gross, minPrice: prices.length ? Math.min(...prices) : 0 };
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Your events</h1>
        <Link
          href="/host/events/new"
          className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep"
        >
          Create an event
        </Link>
      </section>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-faint">No events yet — create your first one.</p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-white">
          {rows.map((e) => {
            const status = STATUS_LABELS[e.status] ?? STATUS_LABELS.draft!;
            return (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/host/events/${e.id}`}
                      className="font-[family-name:var(--font-fraunces)] text-lg font-bold hover:underline"
                    >
                      {e.title}
                    </Link>
                    <span className={`rounded-card border px-2 py-0.5 text-xs font-bold ${status.cls}`}>
                      {status.label}
                    </span>

                  </div>
                  <p className="mt-1 text-xs text-ink-faint">
                    {formatDateTime(e.starts_at)}
                    {e.minPrice > 0 ? ` · from ${formatKobo(e.minPrice, { hideZeroDecimals: true })}` : " · Free"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold">{e.sold} sold</p>
                  <p className="text-xs text-ink-faint">{formatKobo(e.gross, { hideZeroDecimals: true })} gross</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/host/events/${e.id}`}
                    className="rounded-card border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink"
                  >
                    Manage
                  </Link>
                  <Link
                    href={`/host/events/${e.id}/edit`}
                    className="rounded-card border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
