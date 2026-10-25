import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatKobo } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { RequestRefundButton } from "@/components/request-refund-button";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Awaiting payment", cls: "bg-paper-dim text-ink-soft border-line" },
  awaiting_payment: { label: "Awaiting payment", cls: "bg-paper-dim text-ink-soft border-line" },
  paid: { label: "Paid", cls: "bg-success/10 text-success border-success/30" },
  cancelled: { label: "Cancelled", cls: "bg-paper-dim text-ink-faint border-line" },
  expired: { label: "Expired", cls: "bg-paper-dim text-ink-faint border-line" },
  refunded: { label: "Refunded", cls: "bg-danger/10 text-danger border-danger/30" },
  partially_refunded: { label: "Partially refunded", cls: "bg-warning/10 text-warning border-warning/30" },
  failed: { label: "Payment failed", cls: "bg-danger/10 text-danger border-danger/30" },
};

export default async function OrdersPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      `id, status, total_kobo, currency, created_at, paystack_reference, failure_reason,
       event:events(title, slug, starts_at),
       order_items(name_snapshot, quantity),
       refunds(id, status, amount_kobo)`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as unknown as {
    id: string;
    status: string;
    total_kobo: number;
    created_at: string;
    paystack_reference: string | null;
    failure_reason: string | null;
    event: { title: string; slug: string; starts_at: string } | null;
    order_items: { name_snapshot: string; quantity: number }[];
    refunds: { id: string; status: string; amount_kobo: number }[];
  }[];

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Your receipts and payment history will live here."
        action={
          <Link href="/events" className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep">
            Browse events
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const status = STATUS_LABELS[o.status] ?? STATUS_LABELS.pending!;
        const activeRefund = o.refunds.find((r) => r.status === "requested" || r.status === "approved");
        return (
          <article key={o.id} className="rounded-card border border-line bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-bold">
                  {o.event?.title ?? "Order"}
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  Placed {formatDateTime(o.created_at)}
                  {o.paystack_reference ? ` · Ref ${o.paystack_reference}` : ""}
                </p>
                <ul className="mt-2 space-y-0.5 text-sm text-ink-soft">
                  {o.order_items.map((it, i) => (
                    <li key={i}>
                      {it.quantity} × {it.name_snapshot}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right">
                <p className="font-[family-name:var(--font-fraunces)] text-xl font-extrabold">
                  {formatKobo(o.total_kobo, { hideZeroDecimals: true })}
                </p>
                <span className={`mt-1 inline-block rounded-card border px-2 py-0.5 text-xs font-bold ${status.cls}`}>
                  {status.label}
                </span>
              </div>
            </div>

            {o.status === "failed" && o.failure_reason && (
              <p className="mt-3 rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {o.failure_reason}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
              {o.status === "paid" && (
                <Link href="/account/tickets" className="font-semibold text-neon-deep underline underline-offset-2">
                  View tickets
                </Link>
              )}
              {o.status === "pending" && (
                <Link
                  href={`/checkout/${o.id}`}
                  className="rounded-card bg-neon px-4 py-2 text-xs font-bold text-white hover:bg-neon-deep"
                >
                  Complete payment
                </Link>
              )}
              {o.status === "paid" && !activeRefund && o.refunds.length === 0 && (
                <RequestRefundButton orderId={o.id} />
              )}
              {activeRefund && (
                <span className="text-xs font-semibold text-warning">
                  Refund {activeRefund.status} — you'll get an email when it's processed.
                </span>
              )}
              <Link href="/contact" className="text-ink-soft underline underline-offset-2">
                Get help
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
