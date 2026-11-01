import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <article>
      <p className="eyebrow">Legal</p>
      <h1 className="display-lg mt-2">Privacy policy</h1>
      <p className="mt-3 text-sm text-ink-faint">Last updated: 20 October 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="display-md text-ink">What we collect</h2>
          <p className="mt-2">
            Your account details (name, email, optional phone), the events you
            buy tickets for, and technical logs needed to run the service
            securely (IP address, device, and authentication events).
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">Payments</h2>
          <p className="mt-2">
            Card and bank details are handled by Paystack. JaiyePass stores the
            payment reference, amount, currency, and status — never your card
            number, PIN, or CVV.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">What organizers see</h2>
          <p className="mt-2">
            The host of an event you attend sees your name and email on the
            attendee list so they can run entry and answer questions. They do
            not see your payment details. Your QR code contains a secure
            reference only — no personal data.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">Who else touches your data</h2>
          <p className="mt-2">
            Infrastructure providers that host JaiyePass (Supabase for accounts
            and data, Paystack for payments, our email provider for
            receipts and tickets). We never sell personal data.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">Your rights</h2>
          <p className="mt-2">
            You can view and edit your profile in account settings, and ask us
            to export or delete your account data by contacting support.
            Ticket and payment records may be retained where Nigerian law
            requires it.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">Cookies</h2>
          <p className="mt-2">
            We use strictly necessary cookies to keep you signed in. No
            advertising trackers are set without consent.
          </p>
        </section>
        <section>
          <h2 className="display-md text-ink">Questions</h2>
          <p className="mt-2">privacy@jaiyepass.com · Lagos, Nigeria.</p>
        </section>
      </div>
    </article>
  );
}
