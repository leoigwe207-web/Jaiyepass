import Link from "next/link";

const groups = [
  { title: "Discover", links: [{ href: "/events", label: "Browse events" }, { href: "/events?price=free", label: "Free events" }, { href: "/events?date=weekend", label: "This weekend" }, { href: "/collections", label: "Collections" }] },
  { title: "Explore", links: [{ href: "/#how-it-works", label: "How it works" }, { href: "/pricing", label: "Pricing" }, { href: "/signup", label: "Create an account" }, { href: "/help", label: "Help centre" }] },
  { title: "Company", links: [{ href: "/about", label: "About us" }, { href: "/contact", label: "Contact" }, { href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }] },
];

export function SiteFooter() {
  return (
    <footer className="jp-new-footer border-t border-line bg-paper-deep">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <p className="jp-brand-logo">Jaiye<span>Pass</span><span className="jp-logo-star" aria-hidden="true">✳</span></p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">Your pass to a good time. Discover events, book securely, and make memories across Nigeria.</p>
        </div>
        {groups.map(group => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-bold">{group.title}</h2>
            <ul className="mt-4 space-y-3">
              {group.links.map(link => <li key={link.href}><Link href={link.href} className="text-sm text-ink-soft hover:text-neon-deep">{link.label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line px-5 py-5 text-center text-xs text-ink-faint">© {new Date().getFullYear()} JaiyePass · Made for experiences across Nigeria.</div>
    </footer>
  );
}
