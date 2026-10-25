import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <article>
      <p className="eyebrow">Legal</p>
      <h1 className="display-lg mt-2">Terms of service</h1>
      <p className="mt-3 text-sm text-ink-faint">Last updated: 20 October 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="display-md text-ink">1. Using JaiyePass</h2>
          <p className="mt-2">
            You must be at least 18, or have a guardian's consent, to buy
            tickets. Keep your login credentials to yourself and tell us
            immediately if you suspect your account is compromised.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">2. Tickets</h2>
          <p className="mt-2">
            A ticket is valid only when issued through JaiyePass and verified at
            the door. Tickets may be resold or transferred only as the event's
            refund and transfer policy allows. Counterfeit or duplicated QR
            codes are refused entry.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">3. Payments, fees & refunds</h2>
          <p className="mt-2">
            Prices are shown in Nigerian Naira and include any fees stated
            before you pay. Refunds follow the policy shown on each event page.
            We process refunds only after our payment provider confirms them.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">4. Organizer responsibilities</h2>
          <p className="mt-2">
            Hosts must describe events accurately, hold the rights to their
            content, honour the refund policy they set, and comply with
            applicable Nigerian law. We may remove listings that mislead
            attendees or break the law.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">5. Cancellation of events</h2>
          <p className="mt-2">
            If a host cancels, ticket holders are refunded in full. JaiyePass is
            not liable for indirect losses arising from a cancelled event.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">6. Acceptable use</h2>
          <p className="mt-2">
            No scalping bots, bulk automated purchases, scraping, or attempts to
            bypass security. We may suspend accounts that put other attendees
            or hosts at risk.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">7. Changes</h2>
          <p className="mt-2">
            We'll post material changes here and, where appropriate, notify you
            by email. Continued use after an update means you accept the new
            terms.
          </p>
        </section>
      </div>
    </article>
  );
}
