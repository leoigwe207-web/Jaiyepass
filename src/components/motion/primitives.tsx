"use client";

import { type ReactNode, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Source-inspired motion primitive: a restrained rise/fade reveal.
 * No DOM measurements or scroll hijacking; content remains selectable.
 */
export function Reveal({
  children, className = "", delay = 0, once = true,
}: { children: ReactNode; className?: string; delay?: number; once?: boolean }) {
  const reduced = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Server output and no-JS fallback remain visible; only enhance after hydration.
  if (!hydrated || reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18, filter: "blur(5px)" }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, amount: 0.13, margin: "0px 0px -24px 0px" }}
      transition={{ duration: 0.58, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** React Bits-inspired ambient orbit: decorative, respects reduced motion. */
export function OrbitMark({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className={"jp-orbit-mark " + className}
      animate={reduced ? undefined : { rotate: 360 }}
      transition={reduced ? undefined : { duration: 38, ease: "linear", repeat: Infinity }}
    >
      <span className="jp-orbit-dot" /><span className="jp-orbit-inner" /><span className="jp-orbit-core">✳</span>
    </motion.span>
  );
}

/** Input device adaptive microinteraction; no hover-only content. */
export function PressableMotion({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className}
      whileHover={reduced ? undefined : { y: -3 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 360, damping: 27 }}>
      {children}
    </motion.div>
  );
}

/** Motion Primitives-style progress line for the marketing viewport. */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(available > 0 ? Math.max(0, Math.min(100, (window.scrollY / available) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="jp-scroll-progress" role="presentation" style={{ transform: "scaleX(" + progress / 100 + ")" }} />;
}
