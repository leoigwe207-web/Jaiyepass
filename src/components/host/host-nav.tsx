"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/host", label: "Overview" },
  { href: "/host/events", label: "Events" },
  { href: "/host/scanner", label: "Ticket scanner" },
  { href: "/host/payouts", label: "Payouts" },
];

export function HostNav({
  email,
  isHost,
  isPlatformAdmin = false,
}: {
  email: string;
  isHost: boolean;
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const links = LINKS;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-neon-deep">Organizer dashboard</p>
        <p className="mt-0.5 text-sm text-ink-faint">{email}</p>

      </div>
      {(isHost || isPlatformAdmin) && (
        <nav aria-label="Host sections" className="flex flex-wrap gap-1">
          {links.map((link) => {
            const active = link.href === "/host" ? pathname === "/host" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-card px-3 py-1.5 text-sm font-semibold ${
                  active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isPlatformAdmin && <Link href="/admin" className="rounded-card border border-line px-3 py-1.5 text-sm font-semibold text-neon-deep">Platform admin</Link>}
        </nav>
      )}
    </header>
  );
}
