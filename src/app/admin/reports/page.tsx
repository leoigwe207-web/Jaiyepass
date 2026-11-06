import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { FieldDecisionForm } from "@/components/admin/admin-forms";
import { handleReportAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const statuses = ["open", "reviewing", "resolved", "dismissed"] as const;
const statusLabels: Record<string, string> = {
  open: "border-danger/30 bg-danger/10 text-danger",
  reviewing: "border-warning/30 bg-warning/10 text-warning",
  resolved: "border-success/30 bg-success/10 text-success",
  dismissed: "border-line bg-paper-dim text-ink-soft",
};

function reportLink(status: string, page: number) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  return "/admin/reports" + (params.size ? "?" + params.toString() : "");
}

export default async function AdminReportsPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const params = await searchParams;
  const status = statuses.find(s => s === params.status) ?? "all";
  const number = Number(params.page);
  const page = Number.isSafeInteger(number) && number > 0 ? Math.min(10000, number) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const admin = createAdminClient();
  let reportQuery = admin.from("event_reports")
    .select("id, reason, details, status, created_at, event:events(id,title,slug,status), reporter:profiles(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  if (status !== "all") reportQuery = reportQuery.eq("status", status);
  const [
    { data: reports, count: filteredCount, error },
    { count: allReports },
    { count: openReports },
    { count: reviewingReports },
    { count: paidOrders },
    { count: admitted },
    { count: pendingRefunds },
    { count: pendingPayouts },
  ] = await Promise.all([
    reportQuery,
    admin.from("event_reports").select("id", { count: "exact", head: true }),
    admin.from("event_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("event_reports").select("id", { count: "exact", head: true }).eq("status", "reviewing"),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    admin.from("check_ins").select("id", { count: "exact", head: true }).eq("result", "valid"),
    admin.from("refunds").select("id", { count: "exact", head: true }).eq("status", "requested"),
    admin.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));
  const summaries: { title: string; count: number | null }[] = [
    { title: "All event reports", count: allReports },
    { title: "Awaiting review", count: (openReports ?? 0) + (reviewingReports ?? 0) },
    { title: "Paid orders", count: paidOrders },
    { title: "Tickets admitted", count: admitted },
    { title: "Refund requests", count: pendingRefunds },
    { title: "Pending payouts", count: pendingPayouts },
  ];
  return (
    <div className="space-y-8 px-4 sm:px-0">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-neon-deep">Platform-wide overview</p>
        <h1 className="mt-2 text-3xl font-extrabold">Reports & activity</h1>
        <p className="mt-2 text-sm text-ink-soft">Review event complaints and monitor ticketing operations across JaiyePass.</p>
      </header>
      <section aria-label="Reporting overview" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {summaries.map(item => (
          <div key={item.title} className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs font-semibold text-ink-soft">{item.title}</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums">{item.count ?? "—"}</p>
          </div>
        ))}
      </section>
      <section className="rounded-xl border border-line bg-paper-deep p-5">
        <h2 className="text-lg font-bold">More reporting tools</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link href="/admin/payouts" className="text-sm font-semibold text-neon-deep underline">Payouts</Link>
          <Link href="/admin/emails" className="text-sm font-semibold text-neon-deep underline">Ticket email deliveries</Link>
          <Link href="/admin/audit" className="text-sm font-semibold text-neon-deep underline">Audit activity</Link>
          <Link href="/admin/hosts" className="text-sm font-semibold text-neon-deep underline">Organizer reviews</Link>
        </div>
      </section>
      <section className="space-y-5" id="event-reports">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Event reports</h2>
            <p className="mt-1 text-sm text-ink-soft">{filteredCount ?? 0} matching reports · Page {page} of {totalPages}</p>
          </div>
          <nav aria-label="Report status" className="flex flex-wrap gap-2">
            {["all", ...statuses].map(value => (
              <Link key={value} href={reportLink(value, 1)} aria-current={status === value ? "page" : undefined}
                className={"rounded-full border px-3 py-2 text-xs font-bold capitalize " + (status === value ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft")}>
                {value}
              </Link>
            ))}
          </nav>
        </div>
        {error ? (
          <p role="alert" className="rounded-xl border border-danger/40 p-5 text-danger">Reports could not be loaded. Check the database connection.</p>
        ) : !reports?.length ? (
          <p className="rounded-xl border border-line bg-white p-6 text-sm text-ink-soft">No reports match this filter.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {reports.map(report => {
              const event = report.event as unknown as { id: string; title: string; slug: string; status: string } | null;
              const reporter = report.reporter as unknown as { full_name: string | null } | null;
              return (
                <li key={report.id} className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{event?.title ?? "Deleted event"}</h3>
                      <span className={"rounded-full border px-2 py-0.5 text-xs font-bold capitalize " + (statusLabels[report.status] ?? statusLabels.open)}>{report.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft"><strong>{report.reason}</strong>{report.details ? " — " + report.details : ""}</p>
                    <p className="mt-2 text-xs text-ink-faint">Reported by {reporter?.full_name ?? "attendee"} · {formatDateTime(report.created_at)}</p>
                    {event && <Link href={"/events/" + event.slug} className="mt-2 inline-block text-sm font-semibold text-neon-deep underline">View event</Link>}
                  </div>
                  {report.status === "open" && (
                    <div className="w-full max-w-sm">
                      <FieldDecisionForm action={handleReportAction} fields={{ reportId: report.id }} options={[
                        { name: "action", value: "resolve", label: "Resolve", tone: "primary" },
                        { name: "action", value: "dismiss", label: "Dismiss" },
                        { name: "action", value: "hide", label: "Hide listing", tone: "danger" },
                      ]}/>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <nav aria-label="Report pagination" className="flex items-center justify-between">
          {page > 1 ? <Link href={reportLink(status, page - 1)} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold">← Previous</Link> : <span />}
          <span className="text-sm text-ink-soft">Page {page} / {totalPages}</span>
          {page < totalPages ? <Link href={reportLink(status, page + 1)} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold">Next →</Link> : <span />}
        </nav>
      </section>
    </div>
  );
}
