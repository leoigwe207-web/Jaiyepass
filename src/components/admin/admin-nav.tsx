"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Review queue" },
  { href: "/admin/hosts", label: "Organizers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav({ demo = false }: { demo?: boolean }) {
  const pathname = usePathname();
  // Demo sessions only get the sampled review-queue section.
  const links = demo ? LINKS.slice(0, 1) : LINKS;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-danger">JaiyePass admin</p>
        <p className="mt-0.5 text-sm text-ink-faint">
          {demo ? "Demo mode · sample data only" : "Moderation, users, payouts"}
        </p>
      </div>
      <nav aria-label="Admin sections" className="flex flex-wrap gap-1">
        {links.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
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
      </nav>
    </header>
  );
}
