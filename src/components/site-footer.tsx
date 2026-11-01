import Link from "next/link";

const columns = [
  {
    heading: "Discover",
    links: [
      { href: "/events", label: "Browse events" },
      { href: "/events?date=today", label: "Events happening today" },
      { href: "/events?price=free", label: "Free this weekend" },
      { href: "/collections", label: "Collections" },
    ],
  },
  {
    heading: "Hosting",
    links: [
      { href: "/host-onboarding", label: "Sell tickets" },
      { href: "/help", label: "Host help" },
      { href: "/contact", label: "Contact support" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refunds", label: "Refund policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-deep">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <p className="font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
            Jaiye<span className="text-neon-deep">Pass</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-ink-soft">
            Your pass to a good time. Find experiences, meet your people and
            book memorable events across Nigeria.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h2 className="eyebrow">{col.heading}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-soft hover:text-ink hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-ink-faint sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} JaiyePass. Lagos, Nigeria.</p>
          <p>Made for real experiences across Nigeria.</p>
        </div>
      </div>
    </footer>
  );
}
