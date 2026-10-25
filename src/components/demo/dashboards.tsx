import Link from "next/link";
import { formatKobo } from "@/lib/money";
import { formatDateRange, formatDateTime } from "@/lib/format";
import { DemoBadge, EventImage } from "@/components/ui";
import { QRTicket } from "@/components/qr-ticket";
import { demoLogoutAction } from "@/app/(auth)/demo-actions";
import {
  demoAttendeeTickets,
  demoHostOverview,
  demoAdminSummary,
  demoReviewQueue,
} from "@/lib/demo-fixtures";

/**
 * Preview demo dashboards (spec §3): each "Try as …" button opens one of these.
 * Every figure and row is clearly labelled demo data — nothing here is a real
 * transaction, and nothing is written anywhere. Server components only.
 */

/** Shared, prominent demo-mode notice with an exit action. */
export function DemoBanner({ scope }: { scope: string }) {
  return (
    <section
      aria-label="Demo mode notice"
      className="rounded-card border border-dashed border-neon-deep/60 bg-neon/5 p-4 sm:p-5"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neon-deep">
        Preview demo mode · demo data
      </p>
      <p className="mt-1 max-w-prose text-sm text-ink-soft">
        {scope} — sample figures only. No real orders, payments, payouts or
        check-ins exist, and nothing you do here is recorded. Demo mode is
        disabled in production builds and whenever a database is connected.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={demoLogoutAction}>
          <button
            type="submit"
            className="rounded-card border border-ink bg-white px-4 py-2 text-xs font-bold hover:bg-ink hover:text-paper"
          >
            Exit demo
          </button>
        </form>
        <Link
          href="/login"
          className="rounded-card border border-line bg-white px-4 py-2 text-xs font-semibold hover:border-ink"
        >
          Switch role
        </Link>
      </div>
    </section>
  );
}

/* ── Attendee · My Tickets ─────────────────────────────────────────────── */

export function DemoAttendeeTickets() {
  const tickets = demoAttendeeTickets();

  return (
    <div className="space-y-6">
      <DemoBanner scope="Your ticket wallet" />

      <p className="text-sm text-ink-soft">
        {tickets.length} demo tickets · Show the QR code at the gate. In a real
        event the QR is issued after payment and never contains your details.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {tickets.map((t) => (
          <article
            key={t.id}
            className="overflow-hidden rounded-card border border-line bg-white"
            aria-label={`Demo ticket for ${t.event?.title ?? "event"}`}
          >
            <div className="border-b border-line bg-paper-deep px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-[family-name:var(--font-fraunces)] text-lg font-bold">
                    {t.event?.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {t.event && formatDateRange(t.event.starts_at, t.event.ends_at)}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {[t.event?.venue_name, t.event?.city_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-card border px-2 py-0.5 text-xs font-bold ${
                    t.status === "issued"
                      ? "border-success/40 bg-success/10 text-success"
                      : "bg-warning/10 text-warning border-warning/40"
                  }`}
                >
                  {t.status === "issued" ? "Valid" : "Used"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <QRTicket payload={t.payload} disabled={t.status !== "issued"} />
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-ink-faint">Type: </span>
                  {t.ticket_type_name}
                </p>
                <p className="break-all">
                  <span className="text-ink-faint">Code: </span>
                  <code className="text-xs">{t.id.slice(0, 8).toUpperCase()}-DEMO-DEMO</code>
                </p>
                {t.status === "used" && t.used_at && (
                  <p className="text-sm font-semibold text-warning">
                    Entered {formatDateTime(t.used_at)}
                  </p>
                )}
                <DemoBadge />
                <p className="text-xs text-ink-faint">
                  Preview tip: open{" "}
                  <Link href="/scan" className="underline">
                    /scan
                  </Link>{" "}
                  and manually enter{" "}
                  <code className="text-[11px]">{t.payload}</code> to watch the
                  scanner validate this demo ticket.
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ── Host · Overview ───────────────────────────────────────────────────── */

export function DemoHostOverview() {
  const data = demoHostOverview();

  const cards = [
    { label: "Events", value: String(data.stats.events) },
    { label: "Tickets sold", value: String(data.stats.ticketsSold) },
    { label: "Gross sales", value: formatKobo(data.stats.grossKobo, { hideZeroDecimals: true }) },
    { label: "Check-ins", value: String(data.stats.checkIns) },
    { label: "Pending review", value: String(data.stats.pendingReview) },
  ];

  return (
    <div className="space-y-8">
      <DemoBanner scope="Organizer dashboard" />

      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">
            {data.org.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            4 events · <span className="font-semibold text-warning">Verification pending</span>
          </p>
          <p className="mt-2 max-w-prose text-sm text-ink-faint">
            Sample organizer account. Create-event, refund and payout actions
            need a connected database — see the preview demo mode.
          </p>
        </div>
        <span className="rounded-card border border-dashed border-neon-deep/50 bg-neon/5 px-3 py-2 text-xs font-bold text-neon-deep">
          Demo actions disabled
        </span>
      </section>

      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-card border border-line bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-faint">{c.label}</p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
              {c.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-card border border-warning/40 bg-warning/5 p-5">
        <h2 className="font-bold text-warning">
          Refund requests waiting ({data.refundQueue.length})
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {data.refundQueue.map((r) => (
            <li key={r.id}>
              {r.title} — {formatKobo(r.amountKobo, { hideZeroDecimals: true })} ·{" "}
              {formatDateTime(r.at)}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">
          Review them from the event&apos;s page — payouts wait for nothing, but
          refunds are owed promptly.
        </p>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Recent sales</h2>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
          {data.recentSales.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <span className="font-semibold">{o.title}</span>
              <span className="text-right">
                {formatKobo(o.totalKobo, { hideZeroDecimals: true })}{" "}
                <span className="block text-xs text-ink-faint">{formatDateTime(o.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ── Admin · Summary + review queue ────────────────────────────────────── */

export function DemoAdminOverview() {
  const summary = demoAdminSummary();
  const queue = demoReviewQueue();

  return (
    <div className="space-y-8">
      <DemoBanner scope="Admin console" />

      <section>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">
          Platform summary
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Sample figures — not real platform data.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((s) => (
            <div
              key={s.label}
              className={`rounded-card border p-5 ${
                s.highlight ? "border-neon/40 bg-neon/5" : "border-line bg-white"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-faint">
                {s.label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Review queue</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {queue.length} sample events awaiting review · approve, reject and
          request-changes actions are disabled in demo mode
        </p>
        <ul className="mt-4 space-y-4">
          {queue.map((e) => (
            <li key={e.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-bold">
                    {e.title}
                  </h3>
                  <p className="mt-1 text-xs text-ink-faint">
                    {e.org.name} ·{" "}
                    <span
                      className={
                        e.org.verification === "verified"
                          ? "font-semibold text-success"
                          : "font-semibold text-warning"
                      }
                    >
                      {e.org.verification}
                    </span>{" "}
                    · {e.city?.name} · {formatDateTime(e.starts_at)} · submitted{" "}
                    {formatDateTime(e.created_at)}
                  </p>
                  <p className="mt-2 max-w-prose text-sm text-ink-soft line-clamp-3">{e.description}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-faint">
                    {e.ticket_types
                      .map(
                        (t) =>
                          `${t.name}: ${
                            t.price_kobo === 0
                              ? "free"
                              : formatKobo(t.price_kobo, { hideZeroDecimals: true })
                          } × ${t.quantity}`,
                      )
                      .join(" · ")}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                    <DemoBadge />
                    Preview listing image below is generated demo artwork.
                  </p>
                  <div className="mt-3 aspect-[21/9] max-w-md overflow-hidden rounded-card border border-line bg-night">
                    <EventImage src={null} alt={e.title} title={e.title} />
                  </div>
                </div>
                <span className="shrink-0 rounded-card border border-dashed border-ink/40 px-3 py-2 text-xs font-bold text-ink-faint">
                  Approve · Reject · Request changes — disabled in demo
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
