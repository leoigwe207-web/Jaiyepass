"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Review queue" },
  { href: "/admin/hosts", label: "Organizers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/emails", label: "Ticket emails" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <header className="jp-v3-dashboard-sidebar">
      <div className="jp-v3-dashboard-identity">
        <span>PLATFORM ADMIN</span>
        <h1>Control room<span className="text-neon-deep">.</span></h1>
        <p>Manage the people, reports, and experiences that make JaiyePass work.</p>
      </div>
      <nav aria-label="Admin sections" className="jp-v3-dashboard-links">
        {links.map((link,index) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}>
              <span className="jp-v3-dashboard-navnumber">{String(index+1).padStart(2,"0")}</span>{link.label}<span aria-hidden="true" className="ml-auto">↗</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
