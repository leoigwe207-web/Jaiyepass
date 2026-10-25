"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Save/unsave an event for the signed-in attendee. */
export function SaveEventButton({ eventSlug }: { eventSlug: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/saved?slug=${encodeURIComponent(eventSlug)}`)
      .then((r) => (r.ok ? r.json() : { saved: false }))
      .then((j) => !cancelled && setSaved(!!j.saved))
      .catch(() => !cancelled && setSaved(false));
    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  async function toggle() {
    if (saved === null) return;
    if (saved === false) {
      // Not signed in → send to login with a return path.
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: eventSlug }),
      });
      if (res.status === 401) {
        router.push(`/login?next=/events/${eventSlug}`);
        return;
      }
      if (res.ok) {
        setSaved(true);
        return;
      }
    } else {
      setBusy(true);
      const res = await fetch(`/api/saved?slug=${encodeURIComponent(eventSlug)}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push(`/login?next=/events/${eventSlug}`);
      } else if (res.ok) {
        setSaved(false);
      }
      setBusy(false);
    }
  }

  if (saved === null) return <span className="h-10 w-28 rounded-card border border-line" aria-hidden="true" />;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className={`inline-flex h-10 items-center gap-2 rounded-card border px-4 text-sm font-semibold transition-colors ${
        saved ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink"
      }`}
    >
      <span aria-hidden="true">{saved ? "★" : "☆"}</span>
      {saved ? "Saved" : "Save event"}
    </button>
  );
}
