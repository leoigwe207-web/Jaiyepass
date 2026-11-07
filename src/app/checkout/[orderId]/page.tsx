import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderAccess } from "@/lib/guest-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKobo } from "@/lib/money";
import { formatDateTime, relativeDeadline } from "@/lib/format";
import { CheckoutPanel } from "@/components/checkout/checkout-panel";
import { CHECKOUT_ORDER_SELECT } from "@/lib/checkout-order-select";
import { paidCheckoutConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orderId: string }> };

type Order = {
  id: string;
  status: string;
  subtotal_kobo: number;
  discount_kobo: number;
  fee_kobo: number;
  total_kobo: number;
  created_at: string;
  promo_code_id: string | null;
  hold: { expires_at: string; status: string } | null;
  event: {
    id: string;
    title: string;
    slug: string;
    starts_at: string;
    is_demo: boolean;
    venue: { name: string } | null;
    city: { name: string } | null;
  } | null;
  order_items: { name_snapshot: string; unit_price_kobo: number; quantity: number }[];
};

export default async function CheckoutPage({ params }: Params) {
  const { orderId } = await params;
  const access = await getOrderAccess(orderId);
  if (!access) notFound();
  const admin = createAdminClient();
  const { data, error: readError } = await admin
    .from("orders")
.select(CHECKOUT_ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  const order = data as Order | null;
  if (readError) {
    console.error("[checkout] query failed", readError.code);
    throw new Error("Couldn't load your booking.");
  }
  if (!order) notFound();

  // promo_code_id is not a FK to promo_codes in the staging schema.
  // Read the optional display label separately; totals remain from the order.
  // A promo label lookup failure must never turn a valid booking into a 500.
  const promoResult = order.promo_code_id
    ? await admin.from("promo_codes").select("code").eq("id", order.promo_code_id).maybeSingle()
    : null;
  if (promoResult?.error) {
    console.error("[checkout] promo label lookup failed", promoResult.error.code);
  }
  const promoCode = promoResult?.data?.code ?? null;

  if (order.status === "paid") {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-success/30 bg-success/5 p-8 text-center">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-success">Already paid</h1>
        <p className="mt-2 text-sm text-ink-soft">Your tickets have been issued. QR images are sent to your booking email when delivery succeeds.</p>
        <Link
          href={access.userId ? "/account/tickets" : "/events"}
          className="mt-4 inline-block rounded-card bg-ink px-5 py-3 text-sm font-bold text-paper hover:bg-night"
        >
          {access.userId ? "View my tickets" : "Browse events"}
        </Link>
      </div>
    );
  }

  const closed = ["cancelled", "expired", "refunded", "failed"].includes(order.status);
  if (closed) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 text-center">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">This order is {order.status}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          You can start a new order from the event page. Already paid and need help?{" "}
          <Link href="/contact" className="font-semibold text-neon-deep underline underline-offset-2">
            Contact support
          </Link>
          .
        </p>
      </div>
    );
  }

  const holdActive = order.hold?.status === "active" && new Date(order.hold.expires_at) > new Date();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-neon-deep">Checkout</p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">
          {order.event?.title ?? "Your order"}
        </h1>
        {order.event && (
          <p className="mt-1 text-sm text-ink-soft">
            {formatDateTime(order.event.starts_at)}
            {[order.event.venue?.name, order.event.city?.name].filter(Boolean).length > 0 &&
              ` · ${[order.event.venue?.name, order.event.city?.name].filter(Boolean).join(", ")}`}
          </p>
        )}

      </div>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-ink-faint">Your tickets</h2>
        <ul className="mt-3 divide-y divide-line">
          {order.order_items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{item.name_snapshot}</p>
                <p className="text-xs text-ink-faint">
                  {item.quantity} × {formatKobo(item.unit_price_kobo, { hideZeroDecimals: true })}
                </p>
              </div>
              <p className="font-bold">{formatKobo(item.unit_price_kobo * item.quantity, { hideZeroDecimals: true })}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd>{formatKobo(order.subtotal_kobo, { hideZeroDecimals: true })}</dd>
          </div>
          {order.discount_kobo > 0 && (
            <div className="flex justify-between text-success">
              <dt>
                Discount{promoCode ? ` (${promoCode})` : ""}
              </dt>
              <dd>−{formatKobo(order.discount_kobo, { hideZeroDecimals: true })}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">Service fee</dt>
            <dd>{formatKobo(order.fee_kobo, { hideZeroDecimals: true })}</dd>
          </div>
          <div className="flex justify-between pt-1 font-[family-name:var(--font-fraunces)] text-xl font-extrabold">
            <dt>Total</dt>
            <dd>{formatKobo(order.total_kobo, { hideZeroDecimals: true })}</dd>
          </div>
        </dl>

        {order.hold && (
          <p className={`mt-3 text-xs font-semibold ${holdActive ? "text-warning" : "text-danger"}`}>
            {holdActive
              ? `Tickets held for you — ${relativeDeadline(order.hold.expires_at)}.`
              : "Your hold has expired. Go back to the event page to pick tickets again."}
          </p>
        )}
      </section>

      {holdActive ? (
        <section className="rounded-card border border-line bg-white p-5">
          <CheckoutPanel
            orderId={order.id}
            totalKobo={order.total_kobo}
            isFree={order.total_kobo === 0}
            testMode={!paidCheckoutConfigured()}
            appliedCode={promoCode}
          />
        </section>
      ) : (
        <Link
          href={`/events/${order.event?.slug ?? ""}`}
          className="block rounded-card bg-ink px-5 py-3.5 text-center text-sm font-bold text-paper hover:bg-night"
        >
          Start a new order
        </Link>
      )}
    </div>
  );
}
