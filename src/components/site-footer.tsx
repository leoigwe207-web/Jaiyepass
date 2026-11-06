import Link from "next/link";

const groups = [
  { title: "EXPLORE", links: [{ href: "/events", label: "All events" }, { href: "/events?price=free", label: "Free events" }, { href: "/events?date=weekend", label: "This weekend" }, { href: "/collections", label: "Collections" }] },
  { title: "JAIYEPASS", links: [{ href: "/#how-it-works", label: "How it works" }, { href: "/pricing", label: "Pricing" }, { href: "/about", label: "Our story" }, { href: "/help", label: "Help centre" }] },
  { title: "THE IMPORTANT STUFF", links: [{ href: "/contact", label: "Contact us" }, { href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }, { href: "/signup", label: "Create an account" }] },
];

export function SiteFooter() {
  return (
    <footer className="jp-v3-footer">
      <div className="jp-v3-container">
        <div className="jp-v3-footer-main">
          <div className="jp-v3-footer-brand"><p className="jp-v3-footer-kicker">THE BEST PLANS ARE NEVER BORING.</p><p>More living.<br/><em>More memories.</em></p><Link href="/events" className="jp-v3-footer-cta">Find your next event <span aria-hidden="true">↗</span></Link></div>
          <div className="jp-v3-footer-links">{groups.map(group => <nav key={group.title} aria-label={group.title}><h2>{group.title}</h2><ul>{group.links.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul></nav>)}</div>
        </div>
        <div className="jp-v3-footer-bottom"><Link href="/" className="jp-brand-logo" aria-label="JaiyePass home">Jaiye<span>Pass</span><span className="jp-logo-star" aria-hidden="true">✳</span></Link><span>© {new Date().getFullYear()} JaiyePass. Made for good times.</span><span>NIGERIA ↗</span></div>
      </div>
    </footer>
  );
}
