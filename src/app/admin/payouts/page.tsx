import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKobo } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { FieldDecisionForm } from "@/components/admin/admin-forms";
import { setPayoutStatusAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Payouts" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "In review", cls: "bg-warning/10 text-warning border-warning/30" },
  approved: { label: "Approved", cls: "bg-success/10 text-success border-success/30" },
  processing: { label: "Processing", cls: "bg-warning/10 text-warning border-warning/30" },
  paid: { label: "Paid", cls: "bg-success/10 text-success border-success/30" },
  on_hold: { label: "On hold", cls: "bg-danger/10 text-danger border-danger/30" },
  cancelled: { label: "Cancelled", cls: "bg-paper-dim text-ink-faint border-line" },
};

export default async function AdminPayoutsPage() {
  const admin = createAdminClient();
  const { data: payouts } = await admin
    .from("payouts")
    .select(
      `id, amount_kobo, status, reason, created_at,
       org:organizations(name, payout_bank_name, payout_account_number, payout_account_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const pending = (payouts ?? []).filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Payouts</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {pending.length} awaiting review. Bank transfers are executed manually — mark as paid once the transfer is
          confirmed on your side.
        </p>
      </section>

      {(!payouts || payouts.length === 0) ? (
        <p className="text-sm text-ink-faint">No payout requests.</p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-white">
          {payouts.map((p) => {
            const org = p.org as unknown as {
              name: string;
              payout_bank_name: string | null;
              payout_account_number: string | null;
              payout_account_name: string | null;
            } | null;
            const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.pending!;
            return (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-fraunces)] text-lg font-bold">
                    {formatKobo(p.amount_kobo, { hideZeroDecimals: true })}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {org?.name ?? "Unknown org"} ·{" "}
                    {org?.payout_account_number
                      ? `${org.payout_account_name ?? "—"} · ${org.payout_bank_name ?? "—"} · ••••${org.payout_account_number.slice(-4)}`
                      : "no payout details"}{" "}
                    · requested {formatDateTime(p.created_at)}
                  </p>
                  {p.reason && <p className="mt-1 text-xs text-ink-soft">{p.reason}</p>}
                </div>
                <div className="space-y-2 text-right">
                  <span className={`inline-block rounded-card border px-2 py-0.5 text-xs font-bold ${status.cls}`}>
                    {status.label}
                  </span>
                  {p.status !== "paid" && p.status !== "cancelled" && (
                    <FieldDecisionForm
                      action={setPayoutStatusAction}
                      fields={{ payoutId: p.id }}
                      options={[
                        { name: "status", value: "approved", label: "Approve" },
                        { name: "status", value: "processing", label: "Processing" },
                        { name: "status", value: "paid", label: "Mark paid", tone: "primary" },
                        { name: "status", value: "on_hold", label: "Hold", tone: "danger" },
                        { name: "status", value: "cancelled", label: "Cancel", tone: "danger" },
                      ]}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
