"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getAnalyticsConsent, setAnalyticsConsent, type AnalyticsConsent } from "@/lib/analytics/consent";
import {
  identifyAttendee,
  trackEventViewed,
  trackOrderCompleted,
} from "@/lib/analytics/events";

/**
 * Consent banner: one decision, stored on the device, defaulting to "no
 * analytics" until the visitor chooses. Rendered from the root layout.
 */
export function AnalyticsConsentBanner() {
  // undefined = still reading storage (render nothing to avoid a flash).
  const [decision, setDecision] = useState<AnalyticsConsent | undefined>(undefined);

  useEffect(() => {
    setDecision(getAnalyticsConsent());
  }, []);

  if (decision !== null) return null;

  function choose(next: Exclude<AnalyticsConsent, null>) {
    setAnalyticsConsent(next);
    setDecision(next);
  }

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-card border border-line bg-white p-4 shadow-[0_10px_40px_rgba(22,18,14,0.18)]"
    >
      <p className="text-sm leading-relaxed text-ink-soft">
        Can we count which events people go on to buy tickets for? We send event
        ids and totals only — never your name, email, card details or replays.{" "}
        <Link href="/privacy" className="font-semibold text-neon-deep underline underline-offset-2">
          Privacy policy
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose("granted")}
          className="rounded-card bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-night"
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={() => choose("denied")}
          className="rounded-card border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}

/** Fires `event_viewed` once when an event page with tickets on sale opens. */
export function EventViewed({
  eventId,
  isFree,
  ticketTiers,
  soldOut,
}: {
  eventId: string;
  isFree: boolean;
  ticketTiers: number;
  soldOut: boolean;
}) {
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    // Guards against a double mount (React dev) sending the event twice.
    if (sentFor.current === eventId) return;
    sentFor.current = eventId;
    trackEventViewed({ eventId, isFree, ticketTiers, soldOut });
  }, [eventId, isFree, ticketTiers, soldOut]);

  return null;
}

/**
 * Fires `order_completed` once on the paid branch of the payment-return page and
 * identifies the attendee with their opaque user id.
 */
export function OrderCompleted({
  userId,
  orderId,
  eventId,
  totalKobo,
}: {
  userId: string;
  orderId: string;
  eventId: string | null;
  totalKobo: number;
}) {
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    if (sentFor.current === orderId) return;
    sentFor.current = orderId;
    identifyAttendee(userId);
    trackOrderCompleted({ orderId, eventId, totalKobo });
  }, [userId, orderId, eventId, totalKobo]);

  return null;
}
