import type { Metadata } from "next";
import Link from "next/link";
import { getHostContext, getOrgBalance } from "@/lib/host";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKobo } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { OrgForm } from "@/components/host/org-form";

export const metadata: Metadata = { title: "Overview" };

export default async function HostOverviewPage() {

  const { user, orgId } = await getHostContext();

  if (!orgId) {
    return (
      <section className="mx-auto max-w-2xl rounded-card border border-line bg-white p-6 sm:p-8">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Sell tickets on JaiyePass</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Set up your organizer account to create events, manage ticket sales, run door check-in and withdraw your
          earnings. It takes about two minutes.
        </p>
        <div className="mt-6">
          <OrgForm />
        </div>
      </section>
    );
  }

  const admin = createAdminClient();
  const [balance, { data: org }, { count: eventCount }, { data: recentOrders }, { data: pendingRefunds }] =
    await Promise.all([
      getOrgBalance(orgId),
      admin.from("organizations").select("name, verification, verification_note").eq("id", orgId).maybeSingle(),
      admin.from("events").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      admin
        .from("orders")
        .select("id, total_kobo, created_at, events!inner(organization_id, title)")
        .eq("status", "paid")
        .eq("events.organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(8),
      admin
        .from("refunds")
        .select("id, amount_kobo, created_at, orders!inner(event_id, events(organization_id, title))")
        .eq("status", "requested")
        .eq("orders.events.organization_id", orgId)
        .order("created_at", { ascending: true })
        .limit(10),
    ]);

  const verification = org?.verification ?? "unverified";

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">
            {org?.name ?? "Your organizer account"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {eventCount ?? 0} event{(eventCount ?? 0) === 1 ? "" : "s"} ·{" "}
            <span
              className={`font-semibold ${
                verification === "verified" ? "text-success" : verification === "rejected" ? "text-danger" : "text-warning"
              }`}
            >
              {verification === "verified"
                ? "Verified organizer"
                : verification === "rejected"
                  ? "Verification rejected"
                  : "Verification pending"}
            </span>
          </p>
          {verification === "pending" && (
            <p className="mt-2 max-w-prose text-sm text-ink-faint">
              You can create and edit events now. Events go live after our team verifies your account — usually within
              one business day.
            </p>
          )}
          {verification === "rejected" && org?.verification_note && (
            <p className="mt-2 max-w-prose text-sm text-danger">{org.verification_note}</p>
          )}
        </div>
        <Link
          href="/host/events/new"
          className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep"
        >
          Create an event
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gross sales" value={balance.ledgerReady ? formatKobo(balance.grossKobo, { hideZeroDecimals: true }) : "Pending reconciliation"} />
        <StatCard label="Refunded" value={balance.ledgerReady ? formatKobo(balance.refundedKobo, { hideZeroDecimals: true }) : "Pending reconciliation"} />
        <StatCard
          label="Reconciled balance"
          value={balance.ledgerReady ? formatKobo(balance.availableKobo, { hideZeroDecimals: true }) : "Unavailable"}
          highlight
        />
      </section>

      {!balance.ledgerReady && (
        <p role="status" className="rounded-card border border-warning/40 bg-warning/5 p-4 text-sm text-ink-soft">
          Financial ledger setup is pending. Withdrawable balances are temporarily unavailable; no payout is permitted.
        </p>
      )}

      {pendingRefunds && pendingRefunds.length > 0 && (
        <section className="rounded-card border border-warning/40 bg-warning/5 p-5">
          <h2 className="font-bold text-warning">Refund requests waiting ({pendingRefunds.length})</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {pendingRefunds.map((r) => {
              const order = r.orders as unknown as {
                events: { title: string } | null;
              } | null;
              return (
                <li key={r.id}>
                  {order?.events?.title ?? "Event"} — {formatKobo(r.amount_kobo, { hideZeroDecimals: true })} ·{" "}
                  {formatDateTime(r.created_at)}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-sm">
            Review them from the event&apos;s page — Refunds and disputes may affect payout eligibility. Their settlement must be reconciled before withdrawal.
          </p>
        </section>
      )}

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Recent sales</h2>
        {!recentOrders || recentOrders.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">No paid orders yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
            {recentOrders.map((o) => {
              const event = o.events as unknown as { title: string } | null;
              return (
                <li key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <span className="font-semibold">{event?.title ?? "Event"}</span>
                  <span className="text-right">
                    {formatKobo(o.total_kobo, { hideZeroDecimals: true })}{" "}
                    <span className="block text-xs text-ink-faint">{formatDateTime(o.created_at)}</span>
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

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-card border p-5 ${highlight ? "border-neon/40 bg-neon/5" : "border-line bg-white"}`}>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-faint">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">{value}</p>
    </div>
  );
}
