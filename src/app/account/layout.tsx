import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDemoUser } from "@/lib/demo";
import { LogoutButton } from "@/components/logout-button";

const tabs = [
  { href: "/account/tickets", label: "My tickets" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/saved", label: "Saved" },
  { href: "/account/plans", label: "Plans" },
  { href: "/account/profile", label: "Profile" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const demo = await getDemoUser();
  const user = demo ? { fullName: demo.label, email: demo.email } : await requireUser();
  // Demo sessions only get the sampled "My tickets" tab.
  const visibleTabs = demo ? tabs.filter((t) => t.href === "/account/tickets") : tabs;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="display-md mt-1">{user.fullName ?? "Your space"}</h1>
        </div>
        <LogoutButton demo={!!demo} />
      </div>

      <nav aria-label="Account sections" className="mt-6 border-b border-line">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {visibleTabs.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="inline-block whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-ink-soft hover:border-ink hover:text-ink"
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
