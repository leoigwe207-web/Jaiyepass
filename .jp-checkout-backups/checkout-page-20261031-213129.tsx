import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isTestMode } from "@/lib/env";
import { formatKobo } from "@/lib/money";
import { formatDateTime, relativeDeadline } from "@/lib/format";
import { CheckoutPanel } from "@/components/checkout/checkout-panel";

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
  promo_code: { code: string } | null;
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
  const user = await requireUser();
  const { orderId } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      `id, status, subtotal_kobo, discount_kobo, fee_kobo, total_kobo, created_at,
       promo:promo_codes(code),
       hold:inventory_holds(expires_at, status),
       event:events(id, title, slug, starts_at, is_demo, venue:venues(name), city:cities(name)),
       order_items(name_snapshot, unit_price_kobo, quantity)`,
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  const order = data as Order | null;
  if (!order) notFound();

  if (order.status === "paid") {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-success/30 bg-success/5 p-8 text-center">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-success">Already paid</h1>
        <p className="mt-2 text-sm text-ink-soft">This order is complete — your tickets are ready.</p>
        <Link
          href="/account/tickets"
          className="mt-4 inline-block rounded-card bg-ink px-5 py-3 text-sm font-bold text-paper hover:bg-night"
        >
          View my tickets
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
                Discount{order.promo_code ? ` (${order.promo_code.code})` : ""}
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
            testMode={isTestMode()}
            appliedCode={order.promo_code?.code ?? null}
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
