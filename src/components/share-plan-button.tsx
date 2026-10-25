"use client";

import { useState } from "react";

/**
 * Share sheet: copies a direct event link or creates a group plan link
 * so friends can coordinate attendance.
 */
export function SharePlanButton({
  eventId,
  eventSlug,
  eventTitle,
}: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
}) {
  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const eventUrl = typeof window !== "undefined" ? `${window.location.origin}/events/${eventSlug}` : `/events/${eventSlug}`;

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNote(`${label} copied`);
      setTimeout(() => setNote(null), 2500);
    } catch {
      setNote("Copy failed — long-press to copy the link");
    }
  }

  async function makePlan() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/group-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, title: `Plan for ${eventTitle}` }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setNote("Sign in to create a plan link");
      } else if (res.ok) {
        const url = `${window.location.origin}/plans/${json.shareCode}`;
        setPlanUrl(url);
        await copy(url, "Plan link");
      } else {
        setNote(json.error ?? "Could not create a plan link");
      }
    } catch {
      setNote("Network error — try again");
    }
    setBusy(false);
  }

  async function share() {
    const url = eventUrl;
    if (navigator.share) {
      try {
        await navigator.share({ title: eventTitle, url });
        return;
      } catch {
        /* user dismissed */
      }
    }
    copy(url, "Event link");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={share}
        className="inline-flex h-10 items-center gap-2 rounded-card border border-line bg-white px-4 text-sm font-semibold hover:border-ink"
      >
        <span aria-hidden="true">↗</span> Share
      </button>
      <button
        type="button"
        onClick={makePlan}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-card border border-line bg-white px-4 text-sm font-semibold hover:border-ink disabled:opacity-60"
      >
        {busy ? "Creating…" : "Make a group plan"}
      </button>
      {note && (
        <span role="status" className="text-xs font-semibold text-success">
          {note}
        </span>
      )}
      {planUrl && (
        <span className="text-xs text-ink-faint break-all">{planUrl}</span>
      )}
    </div>
  );
}
