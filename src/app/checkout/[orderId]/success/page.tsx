import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderAccess } from "@/lib/guest-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAndFinalizeOrder } from "@/lib/checkout";
import { formatKobo } from "@/lib/money";
import { OrderCompleted } from "@/components/analytics/analytics";
import { deriveQrPayload } from "@/lib/ticket-token";
import { serverEnv } from "@/lib/env";
import { QRTicket } from "@/components/qr-ticket";

export const metadata: Metadata = { title: "Payment status" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orderId: string }> };

/**
 * Payment return page (Paystack callback target). When live keys are
 * configured we verify + finalize here exactly like the webhook does —
 * finalize is idempotent, so whichever arrives first wins.
 */
export default async function CheckoutSuccessPage({ params }: Params) {
  const { orderId } = await params;
  const access = await getOrderAccess(orderId);
  if (!access) notFound();
  const admin = createAdminClient();

  if (process.env.PAYSTACK_SECRET_KEY) {
    const outcome = await verifyAndFinalizeOrder(orderId);
    if (!outcome.ok) console.warn("[checkout] verification pending", outcome.error);
  }

  const { data } = await admin
    .from("orders")
    .select(
      `id, status, total_kobo, subtotal_kobo, fee_kobo, discount_kobo,
       event:events(id, title, slug)`,
    )
    .eq("id", orderId)
    .maybeSingle();

  const order = data as unknown as {
    id: string;
    status: string;
    total_kobo: number;
    event: { id: string; title: string; slug: string } | null;
  } | null;

  const { data: delivery } = order?.status === "paid"
    ? await admin.from("ticket_email_deliveries").select("status").eq("order_id", orderId).maybeSingle()
    : { data: null };
  const paid = order?.status === "paid";
  const status = order?.status ?? null;

  const { data: guestTicketRows } = paid && !access.userId
    ? await admin.from("tickets")
        .select("id, status, ticket_type:ticket_types(name)")
        .eq("order_id", orderId)
    : { data: [] };
  const guestTickets = (guestTicketRows ?? []) as unknown as {
    id: string; status: string; ticket_type: { name: string } | null;
  }[];
  const qrPepper = serverEnv().ticketPepper;

  if (paid) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-success/30 bg-success/5 p-8 text-center">
        {access.userId && <OrderCompleted
          userId={access.userId}
          orderId={order.id}
          eventId={order.event?.id ?? null}
          totalKobo={order.total_kobo}
        />}
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-success">Payment confirmed</p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">
          You&apos;re going to {order?.event?.title ?? "the event"}!
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          {delivery?.status === "sent"
            ? "Your QR tickets were sent to your booking email. Check your inbox and spam folder."
            : "Your tickets have been issued, but QR email delivery is pending. Contact support if your email doesn't arrive."}
          {" "}Never share your QR codes.
        </p>
        {!access.userId && guestTickets.length > 0 && (
          <div className="mt-6 border-t border-line pt-6">
            <h2 className="text-sm font-bold">Your QR passes</h2>
            <p className="mt-1 text-xs text-ink-soft">Show these at the gate. This browser can access them while your booking cookie lasts.</p>
            <div className="mt-4 grid justify-items-center gap-4 sm:grid-cols-2">
              {guestTickets.map((ticket) => (
                <div key={ticket.id} className="flex w-full flex-col items-center gap-2 rounded-card border border-line bg-paper p-4">
                  <p className="text-sm font-semibold">{ticket.ticket_type?.name ?? "Event ticket"}</p>
                  <QRTicket payload={qrPepper ? deriveQrPayload(ticket.id, qrPepper) : ""} disabled={ticket.status !== "issued" || !qrPepper} />
                  <p className="text-xs text-ink-soft">{ticket.status === "issued" ? "Valid for one entry" : "Ticket no longer available"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={access.userId ? "/account/tickets" : "/events"}
            className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep"
          >
            {access.userId ? "View my tickets" : "Browse more events"}
          </Link>
          {access.userId && <Link
            href="/account/orders"
            className="rounded-card border border-line bg-white px-5 py-3 text-sm font-semibold hover:border-ink"
          >
            Order receipt
          </Link>}
        </div>
      </div>
    );
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-warning/40 bg-warning/5 p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-warning">Test mode</p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
          Payment hasn&apos;t been completed
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          Paid checkout is not configured. Your order remains {order?.status ?? status}; no payment has been confirmed.
        </p>
        <Link
          href={`/checkout/${orderId}`}
          className="mt-6 inline-block rounded-card bg-ink px-5 py-3 text-sm font-bold text-paper hover:bg-night"
        >
          Back to checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-faint">Waiting on payment</p>
      <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
        We haven&apos;t confirmed your payment yet
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        {order ? `Your order total was ${formatKobo(order.total_kobo, { hideZeroDecimals: true })}. ` : ""}
        If you completed payment, confirmation usually lands within a minute — refresh this page, or check{" "}
        {access.userId ? <Link href="/account/orders" className="font-semibold text-neon-deep underline underline-offset-2">your orders</Link> : "the email address used at checkout"}
        . We will not retry or charge you again on this page.
      </p>
      <Link
        href={`/checkout/${orderId}`}
        className="mt-6 inline-block rounded-card border border-line px-5 py-3 text-sm font-semibold hover:border-ink"
      >
        Back to checkout
      </Link>
    </div>
  );
}
