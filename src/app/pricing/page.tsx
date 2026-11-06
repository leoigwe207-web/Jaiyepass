import type { Metadata } from "next";
import Link from "next/link";
import { FEE_CAP_KOBO, FEE_RATE, formatKobo } from "@/lib/money";

export const metadata: Metadata = {
  title: "Pricing",
  description: "JaiyePass pricing for event organizers in Nigeria.",
};

const featureGroups = [
  { icon: "◈", title: "Event types", items: ["Free and paid ticket types", "In-person event listings", "Draft and published events", "Recurring and one-off experiences"] },
  { icon: "▣", title: "Selling tickets", items: ["No fee on free tickets", "Secure Paystack checkout", "Ticket quantities and sales windows", "Ticket inventory management"] },
  { icon: "✎", title: "Customisations", items: ["Your own event title and description", "Event cover image and details", "Ticket categories and prices", "Event-specific refund policy"] },
  { icon: "◎", title: "Tracking & management", items: ["Organizer dashboard", "Sales and order information", "QR ticket check-in", "Event and attendee management"] },
  { icon: "✧", title: "Promotion & growth", items: ["Shareable event pages", "Event discovery across Nigeria", "Public event listings", "Promotion codes for tickets"] },
  { icon: "◇", title: "Support & security", items: ["Protected organizer access", "Email ticket confirmations", "Payment verification", "Support and refund requests"] },
];

export default function PricingPage() {
  return (
    <div className="jp-pricing-page">
      <section className="mx-auto max-w-3xl px-5 pb-10 pt-12 text-center sm:pt-20">
        <p className="jp-mini-eyebrow">SIMPLE PRICING</p>
        <h1 className="jp-screen-heading mt-3">Free to sign up.<br/>Simple pricing.</h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-soft">JaiyePass makes it easy to list free events. A small platform fee applies when customers buy paid tickets.</p>
        <p className="mt-6 text-sm font-medium text-ink-soft">🇳🇬 Nigeria · NGN</p>
        <div className="jp-price-panel mx-auto mt-9">
          <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">{FEE_RATE * 100}%</p>
          <p className="mt-2 text-sm font-semibold text-neon-deep">per paid order · capped at {formatKobo(FEE_CAP_KOBO, { hideZeroDecimals: true })}</p>
          <p className="mt-4 text-xs text-ink-soft">Platform fee is added at checkout. Free ticket orders carry no platform fee.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-14 sm:grid-cols-2 lg:grid-cols-3" aria-label="Included features">
        {featureGroups.map(group => (
          <article className="jp-feature-panel" key={group.title}>
            <span className="jp-feature-icon" aria-hidden="true">{group.icon}</span>
            <h2 className="mt-5 text-lg font-bold">{group.title}</h2>
            <ul className="mt-4 space-y-3">
              {group.items.map(item => <li key={item} className="flex gap-2 text-sm text-ink-soft"><span className="text-neon-deep" aria-hidden="true">•</span>{item}</li>)}
            </ul>
          </article>
        ))}
      </section>
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="jp-pricing-contact">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">Here to help</p>
          <h2 className="mt-3 text-3xl font-bold">Have specific event needs?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/90">Tell us about your upcoming experience and we can help you work out what you need.</p>
          <Link href="/contact" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-8 font-bold text-ink hover:bg-paper-deep">Contact us</Link>
        </div>
      </section>
    </div>
  );
}
