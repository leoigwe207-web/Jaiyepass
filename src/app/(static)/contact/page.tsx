import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <article>
      <p className="eyebrow">Contact</p>
      <h1 className="display-lg mt-2">Talk to a human</h1>
      <p className="mt-4 max-w-[60ch] text-ink-soft">
        Payment issue, ticket problem, or a question about hosting? Send a
        message and we respond within one business day (Mon–Sat, WAT).
      </p>
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_240px]">
        <ContactForm />
        <aside className="space-y-5 text-sm">
          <div>
            <h2 className="eyebrow">Support</h2>
            <p className="mt-1 text-ink-soft">support@jaiyepass.com</p>
          </div>
          <div>
            <h2 className="eyebrow">Hosts</h2>
            <p className="mt-1 text-ink-soft">hosts@jaiyepass.com</p>
          </div>
          <div>
            <h2 className="eyebrow">Office</h2>
            <p className="mt-1 text-ink-soft">Lagos, Nigeria</p>
          </div>
          <p className="text-xs text-ink-faint">
            For order-specific issues, include your order reference — never send
            card details by email or chat.
          </p>
        </aside>
      </div>
    </article>
  );
}
