import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article>
      <p className="eyebrow">About JaiyePass</p>
      <h1 className="display-lg mt-2">Your pass to a good time.</h1>
      <div className="mt-6 space-y-5 text-[16px] leading-relaxed text-ink-soft">
        <p>
          JaiyePass helps people discover events, make plans with friends, and
          walk into venues with a secure digital ticket. We start in Lagos — a
          city with more good nights than calendar space — and we build for
          phones first, because that is where the plans happen.
        </p>
        <p>
          For organizers, JaiyePass is the practical side of running an event:
          sell tickets with Nigerian payment methods, see sales as they happen,
          manage guest lists, and check people in at the gate without chaos.
        </p>
        <p>
          We take trust seriously: payments are verified with our provider
          before a ticket exists, every ticket carries a single-use secure
          code, and check-ins are logged so disputes have answers.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/events">Find something on</ButtonLink>
        <ButtonLink href="/host-onboarding" variant="secondary">
          Sell tickets with us
        </ButtonLink>
      </div>
    </article>
  );
}
