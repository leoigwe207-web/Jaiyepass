"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/events", label: "Explore events" },
  { href: "/#discover", label: "The edit" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "Our story" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [accountHref, setAccountHref] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    let active = true;
    const client = createClient();
    async function sync() {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!active) return;
        if (!user) { setAccountHref(null); return; }
        const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (!active) return;
        setAccountHref(profile?.role === "admin" ? "/admin" : user.user_metadata?.account_type === "organizer" ? "/host" : "/account");
      } catch { if (active) setAccountHref(null); }
    }
    void sync();
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
      if (event.key !== "Tab") return;
      const drawer = document.getElementById("jp-menu-drawer");
      const items = drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!items?.length) return;
      const first = items[0]!, last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeys);
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", handleKeys); };
  }, [open]);

  if (pathname === "/login" || pathname === "/signup" || pathname === "/choose-account" ||
    pathname?.startsWith("/host") || pathname?.startsWith("/admin") || pathname?.startsWith("/scan")) return null;

  const label = accountHref === "/admin" ? "Admin dashboard" : accountHref === "/host" ? "Organizer dashboard" : "My dashboard";
  return (
    <>
      <div className="jp-v3-topline"><span>YOUR NEXT GREAT STORY IS OUT THERE</span><span className="hidden sm:inline">MADE FOR NIGERIAN NIGHTS ✳</span><span>GO LIVE A LITTLE ↗</span></div>
      <header className="jp-v3-site-header sticky top-0 z-40">
        <div className="jp-v3-container jp-v3-site-header-inner">
          <Link href="/" className="jp-brand-logo" aria-label="JaiyePass home">Jaiye<span>Pass</span><span className="jp-logo-star" aria-hidden="true">✳</span></Link>
          <nav className="jp-v3-desktop-nav" aria-label="Main navigation">
            {links.slice(0,4).map(link => <Link key={link.href} href={link.href} className={"jp-v3-nav-link " + (pathname === link.href ? "is-active" : "")}>{link.label}</Link>)}
          </nav>
          <div className="jp-v3-desktop-actions">
            {accountHref ? <Link href={accountHref} className="jp-v3-nav-cta">{label} <span aria-hidden="true">↗</span></Link> : <>
              <Link href="/choose-account" className="jp-v3-nav-signin">Sign in</Link>
              <Link href="/signup" className="jp-v3-nav-cta">Get started <span aria-hidden="true">↗</span></Link>
            </>}
          </div>
          <div className="jp-v3-mobile-actions">
            <Link href="/events" className="jp-v3-icon-btn" aria-label="Browse events">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.3" /><path d="m15.2 15.2 5.1 5.1" /></svg>
            </Link>
            <button ref={triggerRef} type="button" aria-label="Open menu" aria-expanded={open} aria-controls="jp-menu-drawer" onClick={() => setOpen(true)} className="jp-v3-icon-btn jp-v3-menu-trigger"><span /><span /><span /></button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div id="jp-menu-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu" data-lenis-prevent
            className="jp-v3-mobile-drawer"
            initial={reduced ? false : { opacity: 0, x: "10%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: "6%" }}
            transition={{ duration: reduced ? 0 : 0.23, ease: [0.22, 1, 0.36, 1] }}>
            <div className="jp-v3-drawer-head">
              <Link href="/" onClick={() => setOpen(false)} className="jp-brand-logo">Jaiye<span>Pass</span><span className="jp-logo-star">✳</span></Link>
              <button ref={closeRef} type="button" className="jp-v3-drawer-close" aria-label="Close menu" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="jp-v3-drawer-caption">FIND YOUR WAY / 001</div>
            <nav aria-label="Mobile navigation" className="jp-v3-drawer-nav">
              {links.map((link,index) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}><span>{String(index+1).padStart(2,"0")}</span><strong>{link.label}</strong><span aria-hidden="true">↗</span></Link>)}
            </nav>
            <div className="jp-v3-drawer-actions">{accountHref ? <Link href={accountHref} className="jp-v3-nav-cta" onClick={() => setOpen(false)}>{label} ↗</Link> : <>
              <Link href="/choose-account" className="jp-v3-drawer-login" onClick={() => setOpen(false)}>Sign in</Link>
              <Link href="/signup" className="jp-v3-nav-cta" onClick={() => setOpen(false)}>Create account ↗</Link>
            </>}</div>
            <div className="jp-v3-drawer-foot">MORE LIVING. LESS SCROLLING. ✳</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
