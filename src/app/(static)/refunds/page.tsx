import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Refund policy" };

export default function RefundsPage() {
  return (
    <article>
      <p className="eyebrow">Legal</p>
      <h1 className="display-lg mt-2">Refund policy</h1>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-soft">
        <p className="text-base text-ink">
          Default: refunds are available up to 48 hours before an event starts,
          unless the host sets a different policy on the event page. The policy
          shown on the event page is the one that applies to your ticket.
        </p>

        <section>
          <h2 className="display-md text-ink">How to request one</h2>
          <p className="mt-2">
            Open the order in My tickets and choose Request refund. You'll get
            an email when the host approves it, and again when the money is
            sent back to your original payment method.
          </p>
        </section>

        <section>
          <h2 className="display-md text-ink">Timing</h2>
          <p className="mt-2">
            Approved refunds are submitted to Paystack immediately and usually
            land in your bank account within 3–7 business days, depending on
            your bank. We only tell you a refund succeeded once Paystack
            confirms it.
          </p>
        </section>

        <section>
          <h2 className="display-md text-ink">When refunds aren't available</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>After the event's refund window has closed.</li>
            <li>For no-shows — arriving late or not arriving is not refundable.</li>
            <li>Where the host's event-page policy states non-refundable ticket types (clearly labelled before purchase).</li>
          </ul>
        </section>

        <section>
          <h2 className="display-md text-ink">Cancelled events</h2>
          <p className="mt-2">
            If a host cancels the event entirely, every ticket is refunded in
            full automatically — you don't need to request anything.
          </p>
        </section>

        <section>
          <h2 className="display-md text-ink">Problems with payment</h2>
          <p className="mt-2">
            Charged but no ticket, or a duplicate charge?{" "}
            <Link href="/contact" className="text-neon-deep underline underline-offset-2">
              Contact support
            </Link>{" "}
            with your order reference. We reconcile every case against
            Paystack's records before issuing or refunding.
          </p>
        </section>
      </div>
    </article>
  );
}
