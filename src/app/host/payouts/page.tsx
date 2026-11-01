import type { Metadata } from "next";
import Link from "next/link";
import { getHostContext, getOrgBalance } from "@/lib/host";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKobo } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { PayoutForm } from "@/components/host/host-forms";
import { requestPayoutAction } from "@/app/host/actions";

export const metadata: Metadata = { title: "Payouts" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "In review", cls: "bg-warning/10 text-warning border-warning/30" },
  approved: { label: "Approved", cls: "bg-success/10 text-success border-success/30" },
  processing: { label: "Processing", cls: "bg-warning/10 text-warning border-warning/30" },
  paid: { label: "Paid", cls: "bg-success/10 text-success border-success/30" },
  on_hold: { label: "On hold", cls: "bg-danger/10 text-danger border-danger/30" },
  cancelled: { label: "Cancelled", cls: "bg-paper-dim text-ink-faint border-line" },
};

export default async function PayoutsPage() {
  const { user, orgId } = await getHostContext();

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
  const [balance, { data: org }, { data: payouts }] = await Promise.all([
    getOrgBalance(orgId),
    admin
      .from("organizations")
      .select("payout_bank_name, payout_account_number, payout_account_name")
      .eq("id", orgId)
      .maybeSingle(),
    admin
      .from("payouts")
      .select("id, amount_kobo, status, reason, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const { data: roleRow } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const canRequest = roleRow?.role === "owner" || roleRow?.role === "admin";
  const hasBankDetails = !!(org?.payout_account_number && org.payout_bank_name);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Payouts</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Sales are not the same as settled funds. Withdrawals use verified reconciled balances only, minus pending
          payouts. Transfers are manually reviewed; timelines depend on bank and provider confirmation.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Ticket revenue" value={balance.ledgerReady ? formatKobo(balance.ticketRevenueKobo, { hideZeroDecimals: true }) : "—"} />
        <Card label="Paid orders" value={balance.ledgerReady ? String(balance.paidOrderCount) : "—"} />
        <Card label="Checkout fees charged" value={balance.ledgerReady ? formatKobo(balance.checkoutFeesKobo, { hideZeroDecimals: true }) : "—"} />
        <Card label="Refunds processed" value={balance.ledgerReady ? formatKobo(balance.refundedKobo, { hideZeroDecimals: true }) : "—"} />
        <Card label="Platform fees reconciled" value={balance.ledgerReady ? formatKobo(balance.platformFeesKobo, { hideZeroDecimals: true }) : "—"} />
        <Card label="Processor fees reconciled" value={balance.ledgerReady ? formatKobo(balance.processorFeesKobo, { hideZeroDecimals: true }) : "—"} />
        <Card label="Payouts reserved" value={balance.ledgerReady ? formatKobo(balance.reservedKobo, { hideZeroDecimals: true }) : "—"} />
        <Card label="Payouts completed" value={balance.ledgerReady ? formatKobo(balance.paidOutKobo, { hideZeroDecimals: true }) : "—"} />
        <Card label="Verified available balance" value={balance.ledgerReady ? formatKobo(balance.availableKobo, { hideZeroDecimals: true }) : "—"} highlight />
      </section>
      {!balance.ledgerReady && (
        <p role="status" className="rounded-card border border-warning/40 bg-warning/5 p-4 text-sm text-ink-soft">
          Verified settlement accounting has not been activated yet. Withdrawals are unavailable until migration,
          Paystack reconciliation and bank-account checks are completed.
        </p>
      )}

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="font-bold">Withdraw funds</h2>
        {!balance.ledgerReady ? (
          <p className="mt-2 text-sm text-ink-faint">Payout requests are securely paused until reconciliation is enabled.</p>
        ) : !hasBankDetails ? (
          <p className="mt-2 text-sm text-ink-faint">
            Register your bank details on your organizer account first (contact support to update them).
          </p>
        ) : balance.availableKobo <= 0 ? (
          <p className="mt-2 text-sm text-ink-faint">No verified, withdrawable settlement is available yet.</p>
        ) : canRequest ? (
          <div className="mt-3">
            <p className="mb-2 text-xs text-ink-faint">
              Sending to {org?.payout_account_name} · {org?.payout_bank_name} · ••••
              {org?.payout_account_number?.slice(-4)}
            </p>
            <PayoutForm
              action={requestPayoutAction}
              availableNaira={Math.floor(balance.availableKobo / 100).toLocaleString("en-NG")}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-faint">Only the account owner or an admin can request payouts.</p>
        )}
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">History</h2>
        {(!payouts || payouts.length === 0) ? (
          <p className="mt-2 text-sm text-ink-faint">No payout requests yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
            {payouts.map((p) => {
              const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.pending!;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-bold">{formatKobo(p.amount_kobo, { hideZeroDecimals: true })}</p>
                    <p className="text-xs text-ink-faint">{formatDateTime(p.created_at)}</p>
                  </div>
                  <span className={`rounded-card border px-2 py-0.5 text-xs font-bold ${status.cls}`}>
                    {status.label}
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

function Card({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-card border p-5 ${highlight ? "border-neon/40 bg-neon/5" : "border-line bg-white"}`}>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-faint">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">{value}</p>
    </div>
  );
}
