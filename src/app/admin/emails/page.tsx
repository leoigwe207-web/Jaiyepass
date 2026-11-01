import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryTicketEmailAction } from "@/app/admin/actions";
import { FieldDecisionForm } from "@/components/admin/admin-forms";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Ticket email delivery" };
export const dynamic = "force-dynamic";

export default async function TicketEmailPage() {
  const admin = createAdminClient();
  const { data: rows, error } = await admin.from("ticket_email_deliveries")
    .select("order_id, status, attempt_count, last_error, updated_at, sent_at")
    .order("updated_at", { ascending: false }).limit(100);
  return <div className="space-y-5">
    <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Ticket email delivery</h1>
    <p className="text-sm text-ink-soft">Actual send attempts only. No mock deliveries. Failed emails can be retried safely.</p>
    {error && <p role="alert" className="text-danger">Could not load email status. Apply the production-hardening migration first.</p>}
    {!error && !rows?.length && <p className="text-sm text-ink-soft">No ticket email attempts yet.</p>}
    <ul className="divide-y divide-line rounded-card border border-line bg-white">
    {(rows ?? []).map((r) => <li key={r.order_id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <div><p className="font-semibold">Order {r.order_id.slice(0, 8)} · {r.status}</p>
      <p className="text-xs text-ink-soft">{r.attempt_count} attempt(s) · {formatDateTime(r.updated_at)}</p>
      {r.status === "failed" && <p className="text-xs text-danger">{r.last_error || "Send failed"}</p>}</div>
      {r.status === "failed" && <div className="max-w-sm"><FieldDecisionForm action={retryTicketEmailAction}
        fields={{ orderId: r.order_id }} options={[{name:"retry",value:"yes",label:"Retry email",tone:"primary"}]}/></div>}
    </li>)}
    </ul>
  </div>;
}
