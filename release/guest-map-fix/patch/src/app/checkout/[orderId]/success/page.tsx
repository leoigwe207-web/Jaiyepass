import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderAccess } from "@/lib/guest-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTestMode } from "@/lib/env";
import { verifyAndFinalizeOrder } from "@/lib/checkout";
import { formatKobo } from "@/lib/money";
import { OrderCompleted } from "@/components/analytics/analytics";

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

  if (!isTestMode()) {
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

  const paid = order?.status === "paid";
  const status = order?.status ?? null;

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
          Your QR tickets have been issued. We send them as attachments to your booking email address after payment is confirmed. Check your inbox and spam folder. Never share your QR codes.
        </p>
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

  if (isTestMode()) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-warning/40 bg-warning/5 p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-warning">Test mode</p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
          Payment hasn&apos;t been completed
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          No Paystack keys are configured, so this order stays {order?.status ?? status} until a payment is simulated
          on the checkout page.
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
        . Nothing was charged twice.
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
