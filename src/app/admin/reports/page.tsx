import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { FieldDecisionForm } from "@/components/admin/admin-forms";
import { handleReportAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Reports" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-danger/10 text-danger border-danger/30" },
  reviewing: { label: "Reviewing", cls: "bg-warning/10 text-warning border-warning/30" },
  resolved: { label: "Resolved", cls: "bg-success/10 text-success border-success/30" },
  dismissed: { label: "Dismissed", cls: "bg-paper-dim text-ink-faint border-line" },
};

export default async function AdminReportsPage() {
  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("event_reports")
    .select(
      `id, reason, details, status, created_at,
       event:events(id, title, slug, status),
       reporter:profiles(full_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const open = (reports ?? []).filter((r) => r.status === "open" || r.status === "reviewing");

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Event reports</h1>
        <p className="mt-1 text-sm text-ink-soft">{open.length} still open</p>
      </section>

      {(!reports || reports.length === 0) ? (
        <p className="text-sm text-ink-faint">No reports. The community is behaving.</p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-white">
          {reports.map((r) => {
            const event = r.event as unknown as { id: string; title: string; slug: string; status: string } | null;
            const reporter = r.reporter as unknown as { full_name: string | null } | null;
            const status = STATUS_LABELS[r.status] ?? STATUS_LABELS.open!;
            return (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{event?.title ?? "Deleted event"}</p>
                    <span className={`rounded-card border px-2 py-0.5 text-xs font-bold ${status.cls}`}>
                      {status.label}
                    </span>
                    {event && (
                      <span className="rounded-card border border-line px-2 py-0.5 text-xs font-bold capitalize">
                        {event.status.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-semibold">{r.reason}</span>
                    {r.details ? ` — ${r.details}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">
                    Reported by {reporter?.full_name ?? "attendee"} · {formatDateTime(r.created_at)}
                  </p>
                  {event && (
                    <Link
                      href={`/events/${event.slug}`}
                      className="mt-1 inline-block text-xs font-semibold text-neon-deep underline underline-offset-2"
                    >
                      View listing ↗
                    </Link>
                  )}
                </div>
                {r.status === "open" && (
                  <div className="max-w-sm">
                    <FieldDecisionForm
                      action={handleReportAction}
                      fields={{ reportId: r.id }}
                      options={[
                        { name: "action", value: "resolve", label: "Resolve", tone: "primary" },
                        { name: "action", value: "dismiss", label: "Dismiss" },
                        { name: "action", value: "hide", label: "Hide listing", tone: "danger" },
                      ]}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
