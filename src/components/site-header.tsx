"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/events", label: "Discover events" },
  { href: "/#how-it-works", label: "How JaiyePass works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About us" },
  { href: "/help", label: "Help & resources" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [accountHref, setAccountHref] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    let live = true;
    const client = createClient();
    async function sync() {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!live) return;
        if (!user) { setAccountHref(null); return; }
        const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (!live) return;
        setAccountHref(profile?.role === "admin" ? "/admin" : user.user_metadata?.account_type === "organizer" ? "/host" : "/account");
      } catch { if (live) setAccountHref(null); }
    }
    void sync();
    return () => { live = false; };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("keydown", onEscape);
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onEscape); };
  }, [open]);

  // The account screens have their own logo and header.
  if (pathname === "/login" || pathname === "/signup" || pathname === "/choose-account" ||
      pathname?.startsWith("/host") || pathname?.startsWith("/admin") || pathname?.startsWith("/scan")) return null;

  const dashboardLabel = accountHref === "/admin" ? "Admin dashboard" : accountHref === "/host" ? "Organizer dashboard" : "My dashboard";
  return (
    <>
      <header className="jp-new-header sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
          <Link href="/" className="jp-brand-logo" aria-label="JaiyePass home">Jaiye<span>Pass</span><span className="jp-logo-star" aria-hidden="true">✳</span></Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            {links.slice(0,4).map(item => <Link key={item.href} href={item.href} className="text-sm font-semibold text-ink-soft hover:text-neon-deep">{item.label}</Link>)}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            {accountHref ? (
              <Link className="jp-button-primary" href={accountHref}>{dashboardLabel}</Link>
            ) : (
              <>
                <Link className="text-sm font-bold text-ink hover:text-neon-deep" href="/choose-account">Sign in</Link>
                <Link className="jp-button-primary" href="/signup">Sign up</Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <Link href="/events" aria-label="Search events" title="Search events" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-paper-deep">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="10.7" cy="10.7" r="6.6"/><path d="M16 16l5 5"/></svg>
            </Link>
            <button ref={triggerRef} type="button" aria-label="Open menu" aria-expanded={open} aria-controls="jp-menu-drawer" onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-paper-deep">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="jp-mobile-drawer fixed inset-0 z-[90] flex flex-col bg-white lg:hidden" id="jp-menu-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="flex h-[86px] items-center justify-between px-6">
            <Link href="/" onClick={() => setOpen(false)} className="jp-brand-logo" aria-label="JaiyePass home">Jaiye<span>Pass</span><span className="jp-logo-star" aria-hidden="true">✳</span></Link>
            <button type="button" ref={closeRef} aria-label="Close menu" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} className="flex h-12 w-12 items-center justify-center rounded-xl text-ink">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-6 pt-9" aria-label="Mobile navigation">
            <ul>
              {links.map(item => (
                <li key={item.href} className="border-b border-line">
                  <Link href={item.href} onClick={() => setOpen(false)} className="block py-6 text-xl font-medium tracking-tight text-ink">{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="grid grid-cols-2 gap-3 border-t border-line bg-white px-6 pb-[max(25px,env(safe-area-inset-bottom))] pt-5">
            {accountHref ? (
              <Link className="jp-button-primary col-span-2 text-center" href={accountHref} onClick={() => setOpen(false)}>{dashboardLabel}</Link>
            ) : (
              <>
                <Link href="/choose-account" onClick={() => setOpen(false)} className="jp-button-secondary text-center">Sign in</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="jp-button-primary text-center">Sign up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
