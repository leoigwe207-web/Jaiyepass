import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { FieldDecisionForm } from "@/components/admin/admin-forms";
import { handleReportAction } from "@/app/admin/actions";
import { ADMIN_REPORTS_SELECT } from "@/lib/admin-report-query";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const reportingTools = [
  { href: "/admin/payouts", title: "Payouts", description: "Review withdrawal requests, settlement status and reconciliation.", number: "01" },
  { href: "/admin/emails", title: "Ticket email deliveries", description: "Check delivery attempts and retry failed ticket emails.", number: "02" },
  { href: "/admin/audit", title: "Audit activity", description: "Inspect recorded administrative and system actions.", number: "03" },
  { href: "/admin/hosts", title: "Organizer reviews", description: "View organizers, investigate complaints, pause or restore accounts.", number: "04" },
] as const;
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
  await requireAdmin();
  const params = await searchParams;
  const status = statuses.find(s => s === params.status) ?? "all";
  const number = Number(params.page);
  const page = Number.isSafeInteger(number) && number > 0 ? Math.min(10000, number) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const admin = createAdminClient();
  let reportQuery = admin.from("event_reports")
    .select(ADMIN_REPORTS_SELECT, { count: "exact" })
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
  // Log diagnostic metadata server-side only; never expose query internals to attendees.
  if (error) console.error("[admin/reports] unable to fetch reports", { code: error.code, message: error.message });
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
      <section aria-label="Additional admin reporting tools" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">More reporting tools</h2>
          <p className="mt-1 text-sm text-ink-soft">Open a tool to review the details.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {reportingTools.map(tool => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex min-h-[136px] flex-col justify-between rounded-xl border border-line bg-white p-5 transition hover:border-neon-deep hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-deep"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-ink group-hover:text-neon-deep">{tool.title}</h3>
                <span aria-hidden="true" className="shrink-0 rounded-lg bg-paper-deep px-2.5 py-1 text-xs font-bold text-neon-deep">{tool.number}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{tool.description}</p>
              <span className="mt-4 text-xs font-bold text-neon-deep">Open tool →</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="space-y-5" id="event-reports">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Event reports</h2>
            <p className="mt-1 text-sm text-ink-soft">{error ? "Report data unavailable" : `${filteredCount ?? 0} matching reports · Page ${page} of ${totalPages}`}</p>
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
          <p role="alert" className="rounded-xl border border-danger/40 p-5 text-danger">Could not load event reports. Please try refreshing the page. If the issue continues, check the server logs.</p>
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
        {!error && <nav aria-label="Report pagination" className="flex items-center justify-between">
          {page > 1 ? <Link href={reportLink(status, page - 1)} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold">← Previous</Link> : <span />}
          <span className="text-sm text-ink-soft">Page {page} / {totalPages}</span>
          {page < totalPages ? <Link href={reportLink(status, page + 1)} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold">Next →</Link> : <span />}
        </nav>}
      </section>
    </div>
  );
}
