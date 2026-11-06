"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Lenis + GSAP, progressively enhanced for fine-pointer desktops.
 * Mobile stays native (better energy use, keyboard and touch interaction).
 */
export function ExperienceMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    if (reduced.matches || !pointer.matches || pathname?.startsWith("/admin") ||
        pathname?.startsWith("/host") || pathname?.startsWith("/account") ||
        pathname?.startsWith("/checkout") || pathname?.startsWith("/scan")) return;

    let disposed = false;
    let lenis: { destroy: () => void; raf: (t: number) => void; on: (e: string, fn: () => void) => void } | null = null;
    let cleanup: (() => void) | undefined;

    async function boot() {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"), import("gsap"), import("gsap/ScrollTrigger"),
      ]);
      if (disposed || reduced.matches) return;
      gsap.registerPlugin(ScrollTrigger);
      const instance = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.85,
      });
      lenis = instance;
      instance.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => instance.raf(time * 1000);
      gsap.ticker.add(tick);

      // The hero entrance uses a single shared timeline, not a separate
      // scroll observer for each word. Skip it when loading mid-page.
      const ctx = gsap.context(() => {
        const hero = document.querySelector("[data-jp-hero]");
        if (!hero || window.scrollY > 100) return;
        gsap.fromTo("[data-jp-hero-line]", { y: 32, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, ease: "power3.out", stagger: 0.12, clearProps: "transform,opacity" });
      });
      cleanup = () => {
        ctx.revert();
        gsap.ticker.remove(tick);
        ScrollTrigger.refresh();
        instance.destroy();
      };
    }
    void boot().catch(() => {
      // Native scroll and content remain fully functional if motion can't load.
    });

    return () => {
      disposed = true;
      if (cleanup) cleanup();
      else lenis?.destroy();
    };
  }, [pathname]);
  return null;
}
