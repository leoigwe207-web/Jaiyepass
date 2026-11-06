import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHostContext } from "@/lib/host";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { formatLagosTicketDateTime } from "@/lib/ticket-sales-time";
import { formatKobo } from "@/lib/money";
import { TicketTypeForm, PromoForm, ScannerForm } from "@/components/host/host-forms";
import { EventCoverUploader } from "@/components/host/event-cover-uploader";
import {
  SubmitForReviewButton,
  CancelEventButton,
  TicketStatusButton,
  ScannerRemoveButton,
  PromoToggleButton,
  RefundDecisionButton,
} from "@/components/host/buttons";
import {
  addTicketTypeAction,
  setTicketTypeStatusAction,
  createPromoAction,
  togglePromoAction,
  addScannerAction,
  removeScannerAction,
  submitEventForReviewAction,
  cancelEventAction,
  approveRefundAction,
  rejectRefundAction,
} from "@/app/host/actions";

export const metadata: Metadata = { title: "Manage event" };

type Params = { params: Promise<{ id: string }> };

export default async function HostEventPage({ params }: Params) {
  const { id } = await params;
  const { orgId } = await getHostContext();
  if (!orgId) notFound();

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select(
      `id, title, slug, status, starts_at, ends_at, is_demo, review_note, image_url,
       venue:venues(name, address), city:cities(name)`,
    )
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!event || event.is_demo) notFound();

  const [{ data: ticketTypes }, { data: promos }, { data: scanners }, { data: refunds }, { data: orders }] =
    await Promise.all([
      admin
        .from("ticket_types")
        .select("id, name, description, price_kobo, quantity, sold_count, per_order_limit, status, sales_start_at, sales_end_at")
        .eq("event_id", id)
        .order("sort_order"),
      admin.from("promo_codes").select("id, code, kind, value, max_redemptions, redemptions_used, is_active").eq("event_id", id),
      admin
        .from("event_scanners")
        .select("id, user_id, created_at, profile:profiles(full_name, email)")
        .eq("event_id", id),
      admin
        .from("refunds")
        .select(
          "id, amount_kobo, status, reason, created_at, orders!inner(event_id, id, profiles(full_name, email), events(title))",
        )
        .eq("orders.event_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
      admin
        .from("orders")
        .select(
          "id, total_kobo, created_at, user_id, tickets(count), profiles(full_name, email), order_items(name_snapshot, quantity)",
        )
        .eq("event_id", id)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const totalSold = (ticketTypes ?? []).reduce((sum, t) => sum + t.sold_count, 0);
  const grossKobo = (ticketTypes ?? []).reduce((sum, t) => sum + t.price_kobo * t.sold_count, 0);
  const canSubmit = ["draft", "rejected"].includes(event.status);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">{event.title}</h1>
            <span className="rounded-card border border-line bg-paper px-2 py-0.5 text-xs font-bold capitalize">
              {event.status.replace("_", " ")}
            </span>

          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {formatDateTime(event.starts_at)} ·
            {[
              (event.venue as unknown as { name: string } | null)?.name,
              (event.city as unknown as { name: string } | null)?.name,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canSubmit && (
              <SubmitForReviewButton run={submitEventForReviewAction.bind(null, event.id)} />
            )}
            {["published", "approved", "pending_review"].includes(event.status) && (
              <CancelEventButton run={cancelEventAction.bind(null, event.id)} />
            )}
            <Link
              href={`/host/events/${event.id}/edit`}
              className="rounded-card border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink"
            >
              Edit details
            </Link>
            {event.status === "published" && (
              <Link
                href={`/events/${event.slug}`}
                className="rounded-card border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink"
              >
                View public page ↗
              </Link>
            )}
          </div>
          {event.status === "rejected" && event.review_note && (
            <p className="mt-3 max-w-prose rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              Review note: {event.review_note}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-card border border-line bg-white px-4 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-faint">Sold</p>
            <p className="font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">{totalSold}</p>
          </div>
          <div className="rounded-card border border-line bg-white px-4 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-faint">Gross</p>
            <p className="font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
              {formatKobo(grossKobo, { hideZeroDecimals: true })}
            </p>
          </div>
        </div>
      </section>

      <EventCoverUploader eventId={event.id} initialUrl={event.image_url} />

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Tickets</h2>
        {(ticketTypes ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">
            No ticket types yet — add at least one before submitting for review.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
            {(ticketTypes ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {t.name}{" "}
                    <span className="text-sm text-ink-faint">
                      {t.price_kobo === 0 ? "Free" : formatKobo(t.price_kobo, { hideZeroDecimals: true })}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {t.sold_count} / {t.quantity} sold · max {t.per_order_limit} per order
                    {t.sales_start_at ? ` · from ${formatLagosTicketDateTime(t.sales_start_at)}` : ""}
                    {t.sales_end_at ? ` · until ${formatLagosTicketDateTime(t.sales_end_at)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-card border border-line px-2 py-0.5 text-xs font-bold capitalize">{t.status}</span>
                  {t.status === "active" && (
                    <TicketStatusButton
                      run={setTicketTypeStatusAction.bind(null, t.id, "paused")}
                      label="Pause sales"
                    />
                  )}
                  {t.status === "paused" && (
                    <TicketStatusButton
                      run={setTicketTypeStatusAction.bind(null, t.id, "active")}
                      label="Resume sales"
                    />
                  )}
                  {t.status !== "closed" && t.sold_count === 0 && (
                    <TicketStatusButton
                      run={setTicketTypeStatusAction.bind(null, t.id, "closed")}
                      label="Close"
                      danger
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <TicketTypeForm action={addTicketTypeAction.bind(null, event.id)} />
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Promo codes</h2>
        {(promos ?? []).length > 0 && (
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
            {(promos ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-bold">{p.code}</p>
                  <p className="text-xs text-ink-faint">
                    {p.kind === "percentage" ? `${p.value}% off` : `${formatKobo(p.value, { hideZeroDecimals: true })} off`}
                    {p.max_redemptions !== null ? ` · ${p.redemptions_used}/${p.max_redemptions} used` : ` · ${p.redemptions_used} used`}
                  </p>
                </div>
                <PromoToggleButton run={togglePromoAction.bind(null, p.id)} active={p.is_active} />
              </li>
            ))}
          </ul>
        )}
        <PromoForm action={createPromoAction.bind(null, event.id)} />
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Door scanners</h2>
        {(scanners ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">No scanners assigned yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
            {(scanners ?? []).map((s) => {
              const profile = s.profile as unknown as { full_name: string | null; email: string } | null;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-semibold">{profile?.full_name ?? "Scanner"}</p>
                    <p className="text-xs text-ink-faint">{profile?.email}</p>
                  </div>
                  <ScannerRemoveButton run={removeScannerAction.bind(null, s.id)} />
                </li>
              );
            })}
          </ul>
        )}
        <ScannerForm action={addScannerAction.bind(null, event.id)} />
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Refund requests</h2>
        {(refunds ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">No refund requests.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-white">
            {(refunds ?? []).map((r) => {
              const order = r.orders as unknown as {
                id: string;
                profiles: { full_name: string | null; email: string } | null;
              } | null;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-semibold">
                      {order?.profiles?.full_name ?? "Attendee"} · {formatKobo(r.amount_kobo, { hideZeroDecimals: true })}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {r.reason ?? "No reason given"} · {formatDateTime(r.created_at)} ·{" "}
                      <span className="font-bold capitalize">{r.status}</span>
                    </p>
                  </div>
                  {r.status === "requested" && (
                    <span className="flex gap-2">
                      <RefundDecisionButton run={approveRefundAction.bind(null, r.id)} decision="approve" />
                      <RefundDecisionButton run={rejectRefundAction.bind(null, r.id)} decision="reject" />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Attendees</h2>
        {(orders ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">No paid orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-card border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.1em] text-ink-faint">
                <tr>
                  <th className="px-4 py-3">Attendee</th>
                  <th className="px-4 py-3">Tickets</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(orders ?? []).map((o) => {
                  const profile = o.profiles as unknown as { full_name: string | null; email: string } | null;
                  const items = (o.order_items ?? [])
                    .map((it) => `${it.quantity} × ${it.name_snapshot}`)
                    .join(", ");
                  return (
                    <tr key={o.id}>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{profile?.full_name ?? "Attendee"}</span>
                        <span className="block text-xs text-ink-faint">{profile?.email}</span>
                      </td>
                      <td className="px-4 py-3">{items}</td>
                      <td className="px-4 py-3 font-semibold">{formatKobo(o.total_kobo, { hideZeroDecimals: true })}</td>
                      <td className="px-4 py-3 text-xs text-ink-faint">{formatDateTime(o.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
