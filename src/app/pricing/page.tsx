import type { Metadata } from "next";
import Link from "next/link";
import { FEE_CAP_KOBO, FEE_RATE, formatKobo } from "@/lib/money";
import { Reveal } from "@/components/motion/primitives";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Transparent platform fees for JaiyePass event organizers in Nigeria.",
};

const features = [
  { icon: "✳", title: "Create your way", details: "Build the kind of experience people remember.", items: ["Free and paid ticket categories", "Event images and descriptions", "Drafts before going live", "Ticket sales windows"] },
  { icon: "↗", title: "Sell with confidence", details: "A checkout designed to make yes easy.", items: ["Paystack-powered checkout", "Secure order verification", "Inventory and capacity limits", "Clear checkout fee breakdown"] },
  { icon: "◎", title: "Know your audience", details: "Simple tools to make every event smoother.", items: ["Event and order dashboard", "QR ticket check-in", "Sales and attendance overview", "Payout and refund request history"] },
  { icon: "◇", title: "Own your story", details: "Let your event take center stage.", items: ["Shareable public event pages", "Event cover image", "Venue and schedule details", "Ticket categories and prices"] },
  { icon: "▣", title: "Plan the details", details: "Keep the busywork out of your best moments.", items: ["Attendee management", "Event promotion codes", "Mobile-friendly event pages", "Scanner access for event teams"] },
  { icon: "✦", title: "Built for trust", details: "A smoother experience from purchase to entry.", items: ["Email ticket delivery", "Protected account access", "Payment status verification", "Support and reporting tools"] },
];
const percent = Number((FEE_RATE * 100).toFixed(2));
export default function PricingPage() {
  return (
    <div className="jp-v3-pricing">
      <section className="jp-v3-pricing-hero">
        <div className="jp-v3-container jp-v3-pricing-layout">
          <Reveal>
            <span className="jp-v3-section-kicker">SIMPLE PRICING / NO SURPRISES</span>
            <h1>Good events.<br/><em>Great value.</em></h1>
            <p>Creating an event should be the fun part. Start free and pay a small platform fee when tickets sell.</p>
            <Link href="/signup?role=organizer" className="jp-v3-dark-cta">Create an account <span aria-hidden="true">↗</span></Link>
          </Reveal>
          <Reveal className="jp-v3-fee-card" delay={0.12}>
            <div className="jp-v3-fee-top"><span>THE JAIYEPASS PLATFORM FEE</span><span>NG / ₦</span></div>
            <div className="jp-v3-fee-number">{percent}<span>%</span></div>
            <p>per paid order</p>
            <div className="jp-v3-fee-rule" />
            <div className="jp-v3-fee-detail"><span>Maximum platform fee</span><strong>{formatKobo(FEE_CAP_KOBO, { hideZeroDecimals: true })}</strong></div>
            <div className="jp-v3-fee-detail"><span>Free tickets</span><strong>₦0 fee</strong></div>
            <span className="jp-v3-fee-footnote">The platform fee is added at checkout. Payment-provider terms and applicable costs are displayed where relevant.</span>
            <span className="jp-v3-fee-deco" aria-hidden="true">✳</span>
          </Reveal>
        </div>
      </section>

      <section className="jp-v3-section jp-v3-container">
        <Reveal className="jp-v3-section-top">
          <div><span className="jp-v3-section-kicker">THE TOOLKIT / 001</span><h2 className="jp-v3-section-title">Everything you need.<br/><em>Nothing you don't.</em></h2><p className="jp-v3-section-copy">One place to create, sell, organize, and make the night happen.</p></div>
        </Reveal>
        <div className="jp-v3-pricing-grid">
          {features.map((feature,i) => <Reveal key={feature.title} delay={(i % 3) * 0.06}>
            <article className="jp-v3-pricing-feature"><span aria-hidden="true" className="jp-v3-pricing-icon">{feature.icon}</span><h3>{feature.title}</h3><p>{feature.details}</p><ul>{feature.items.map(item => <li key={item}><span aria-hidden="true">↗</span>{item}</li>)}</ul></article>
          </Reveal>)}
        </div>
      </section>
      <section className="jp-v3-pricing-banner">
        <div className="jp-v3-container jp-v3-pricing-banner-inner">
          <Reveal><span className="jp-v3-section-kicker">LET'S MAKE IT HAPPEN / 002</span><h2>Big plans?<br/><em>We're listening.</em></h2><p>Have a specific question about your event, ticketing, or platform pricing? Reach out.</p></Reveal>
          <Link href="/contact" className="jp-v3-white-cta">Talk to us ↗</Link>
          <span className="jp-v3-pricing-banner-star" aria-hidden="true">✳</span>
        </div>
      </section>
    </div>
  );
}
