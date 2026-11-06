"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/host", label: "Overview" },
  { href: "/host/events", label: "My events" },
  { href: "/host/scanner", label: "Ticket scanner" },
  { href: "/host/payouts", label: "Payouts" },
];

export function HostNav({ email, isHost, isPlatformAdmin = false }: {
  email: string; isHost: boolean; isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  return (
    <header className="jp-v3-dashboard-sidebar">
      <div className="jp-v3-dashboard-identity">
        <span>ORGANIZER STUDIO</span>
        <h1>Make it happen<span className="text-neon-deep">.</span></h1>
        <p>{email}</p>
      </div>
      {(isHost || isPlatformAdmin) && <nav aria-label="Host sections" className="jp-v3-dashboard-links">
        {links.map((link,index) => {
          const active = link.href === "/host" ? pathname === "/host" : pathname?.startsWith(link.href);
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}>
            <span className="jp-v3-dashboard-navnumber">{String(index+1).padStart(2,"0")}</span>{link.label}<span aria-hidden="true" className="ml-auto">↗</span>
          </Link>;
        })}
        {isPlatformAdmin && <Link href="/admin"><span className="jp-v3-dashboard-navnumber">05</span>Platform admin<span aria-hidden="true" className="ml-auto">↗</span></Link>}
      </nav>}
    </header>
  );
}
