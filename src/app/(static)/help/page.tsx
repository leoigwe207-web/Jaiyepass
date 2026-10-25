import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Help" };

const sections = [
  {
    heading: "Tickets & entry",
    items: [
      {
        q: "Where is my ticket?",
        a: "Open My tickets in your account — your QR code lives there, and we email it after payment is confirmed. The QR only carries a secure code, so forwarding it shares your ticket.",
      },
      {
        q: "My QR code won't scan at the gate",
        a: "Turn your screen brightness up and show the code, not a screenshot of your order page. Still stuck? Staff can look you up with the order reference from your confirmation email.",
      },
      {
        q: "Can I transfer my ticket?",
        a: "Message the host through the event page. Transfers are handled by the host so the door list stays accurate.",
      },
    ],
  },
  {
    heading: "Payments & refunds",
    items: [
      {
        q: "I paid but got no ticket",
        a: "Payments sometimes take a few seconds to confirm. Wait one minute and refresh My tickets. If it's still missing, contact support with your order reference — we reconcile against Paystack before reissuing.",
      },
      {
        q: "How do refunds work?",
        a: "Each event lists its refund policy. Request a refund from the order page; if approved, the money returns to your card through Paystack, typically within 3–7 business days.",
      },
      {
        q: "Was I charged twice?",
        a: "Check your bank statement for a pending authorization — duplicate debits on failed attempts release automatically. If two settled charges exist for one order, contact support with both references.",
      },
    ],
  },
  {
    heading: "Account",
    items: [
      {
        q: "I can't sign in",
        a: "Use Reset password on the sign-in page. If the email doesn't arrive in a few minutes, check spam and confirm you used the same address you signed up with.",
      },
      {
        q: "How do I become a host?",
        a: "Open Sell tickets in the menu, create your organization, and submit your first event for review. Most listings are reviewed within 24 hours.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <article>
      <p className="eyebrow">Help</p>
      <h1 className="display-lg mt-2">How can we help?</h1>

      <div className="mt-10 space-y-10">
        {sections.map((s) => (
          <section key={s.heading} aria-labelledby={`help-${s.heading.replace(/\s+/g, "-")}`}>
            <h2
              id={`help-${s.heading.replace(/\s+/g, "-")}`}
              className="display-md border-b border-line pb-3"
            >
              {s.heading}
            </h2>
            <dl className="mt-4 divide-y divide-line">
              {s.items.map((item) => (
                <div key={item.q} className="py-4">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-1 max-w-[68ch] text-sm leading-relaxed text-ink-soft">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-card border border-line bg-paper-deep p-6">
        <p className="font-semibold">Still stuck?</p>
        <p className="mt-1 text-sm text-ink-soft">
          Email{" "}
          <Link href="/contact" className="text-neon-deep underline underline-offset-2">
            support through our contact page
          </Link>{" "}
          with your order reference. Never send card numbers or PINs.
        </p>
      </div>
    </article>
  );
}
