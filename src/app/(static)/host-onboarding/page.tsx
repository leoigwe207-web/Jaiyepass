import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sell tickets",
  description: "Host your event on JaiyePass — Nigerian payments, real-time sales, gate check-in.",
};

const steps = [
  {
    title: "Create your organization",
    body: "One profile for your brand: contact details, payout bank account, and the people who help you run events.",
  },
  {
    title: "List the event",
    body: "Title, dates, venue, photos, and your refund policy. Save as a draft, submit when ready — we review listings within 24 hours.",
  },
  {
    title: "Set up tickets",
    body: "General, VIP, early bird — set prices in naira, quantities, sales windows, and per-order limits.",
  },
  {
    title: "Sell and scan",
    body: "Share your event link, watch sales in the dashboard, export your guest list, and check attendees in from your phone.",
  },
];

export default function HostOnboardingPage() {
  return (
    <article>
      <p className="eyebrow">For organizers</p>
      <h1 className="display-lg mt-2">Sell tickets. Run the gate. Know your numbers.</h1>
      <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-soft">
        JaiyePass gives organizers across Nigeria the tools they actually need: secure
        Paystack checkout, honest inventory that can't oversell, a guest list
        you can search, and check-in that works on any phone at the gate.
      </p>

      <ol className="mt-10 space-y-6">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 border-b border-line pb-6">
            <span
              aria-hidden="true"
              className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold text-neon-deep"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-bold">{s.title}</h2>
              <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-10" aria-labelledby="pricing-heading">
        <h2 id="pricing-heading" className="display-md">
          What it costs
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-line bg-white p-5">
            <p className="eyebrow">Platform fee</p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">
              2.5%
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              per paid ticket, capped at ₦2,000. Free events stay free.
            </p>
          </div>
          <div className="rounded-card border border-line bg-white p-5">
            <p className="eyebrow">Listing</p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">₦0</p>
            <p className="mt-1 text-sm text-ink-soft">
              No monthly charge. Payouts reviewed and released weekly.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="payouts-heading">
        <h2 id="payouts-heading" className="display-md">
          Payouts, plainly
        </h2>
        <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-ink-soft">
          After an event, you request a payout from your dashboard. Our team
          checks attendee disputes and refunds, then releases the balance to
          your registered bank account. Every payout has a status and a history
          you can see — nothing moves without a record.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/choose-account">Create a host account</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Talk to us first
        </ButtonLink>
      </div>

      <p className="mt-6 text-sm text-ink-faint">
        Already selling tickets?{" "}
        <Link href="/choose-account" className="underline underline-offset-2 hover:text-ink">
          Sign in
        </Link>
        .
      </p>
    </article>
  );
}
