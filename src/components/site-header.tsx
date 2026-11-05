"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/events", label: "Browse" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [accountHref, setAccountHref] = useState<string | null>(null);

  // UI hint only: protected routes still verify Supabase identity and the DB role.
  // Recheck when the path changes because server action sign-in sets cookies.
  useEffect(() => {
    let active = true;
    async function syncSession() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session?.user) {
          setAccountHref(null);
          return;
        }
        const { data: profile } = await supabase.from("profiles")
          .select("role").eq("id", session.user.id).maybeSingle();
        if (active) setAccountHref(profile?.role === "admin" ? "/admin" : session.user.user_metadata?.account_type === "organizer" ? "/host" : "/account/tickets");
      } catch {
        if (active) setAccountHref(null);
      }
    }
    void syncSession();
    return () => { active = false; };
  }, [pathname]);

  const signInTarget = accountHref ?? "/choose-account";
  const signInLabel = accountHref === "/admin" ? "Admin dashboard" : accountHref === "/host" ? "Organizer dashboard" : accountHref ? "My dashboard" : "Sign in";

  // Dashboards render their own chrome.
  if (pathname?.startsWith("/host") || pathname?.startsWith("/admin") || pathname?.startsWith("/scan")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2" aria-label="JaiyePass home">
          <span className="font-[family-name:var(--font-fraunces)] text-2xl font-extrabold tracking-tight">
            Jaiye<span className="text-neon-deep">Pass</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="jp-nav-link text-sm font-medium text-ink-soft hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={signInTarget}
            className="jp-primary-action rounded-card bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-night"
          >
            {signInLabel}
          </Link>
        </nav>

        <button
          type="button"
          className="md:hidden rounded-card border border-line px-3 py-2 text-sm font-semibold transition-colors hover:bg-paper-deep"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-paper px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-3">
            {[...navLinks, { href: signInTarget, label: signInLabel }].map(
              (l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block py-2 text-base font-medium"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
