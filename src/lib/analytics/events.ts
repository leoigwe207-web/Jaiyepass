// Analytics handlers for the three actions in the product question
// (see posthog-analytics.md). Call these from the components that perform the
// action — never from a generic page view.

import { captureAnalyticsEvent, identifyAnalyticsUser, resetAnalytics } from "./client";

/** An event page with tickets on sale was opened. */
export function trackEventViewed(input: {
  eventId: string;
  isFree: boolean;
  ticketTiers: number;
  soldOut: boolean;
}): void {
  captureAnalyticsEvent("event_viewed", {
    event_id: input.eventId,
    is_free: input.isFree,
    ticket_tiers: input.ticketTiers,
    sold_out: input.soldOut,
  });
}

/** A pending order was created and the buyer is heading to checkout. */
export function trackCheckoutStarted(input: {
  eventId: string;
  ticketQuantity: number;
  totalKobo: number;
}): void {
  captureAnalyticsEvent("checkout_started", {
    event_id: input.eventId,
    ticket_quantity: input.ticketQuantity,
    total_kobo: input.totalKobo,
  });
}

/** The payment-return page confirmed a paid order. */
export function trackOrderCompleted(input: {
  orderId: string;
  eventId: string | null;
  totalKobo: number;
}): void {
  const properties: Record<string, unknown> = {
    order_id: input.orderId,
    total_kobo: input.totalKobo,
  };
  if (input.eventId) properties.event_id = input.eventId;
  captureAnalyticsEvent("order_completed", properties);
}

/** Signed-in attendee: opaque Supabase user id only, no person properties. */
export function identifyAttendee(userId: string): void {
  identifyAnalyticsUser(userId);
}

/** Sign-out: forget the identity so the next visitor starts anonymous. */
export function forgetAttendee(): void {
  resetAnalytics();
}
