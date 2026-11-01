// PostHog event contract. This is the only place that decides which events and
// which properties may leave the browser — see posthog-analytics.md.

/** Public project token (safe for the browser). Empty ⇒ analytics is off. */
export const POSTHOG_PROJECT_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? "";

/**
 * Ingestion host. Must be explicit (`https://us.i.posthog.com`,
 * `https://eu.i.posthog.com` or a self-hosted ingestion domain); there is no
 * default region, so an unset host keeps capture off.
 */
export const POSTHOG_INGESTION_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "";

export const ANALYTICS_EVENTS = ["event_viewed", "checkout_started", "order_completed"] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/**
 * Value kinds: an opaque id (`event_id`), a non-negative count/amount in kobo,
 * or a literal boolean. A value of the wrong kind is dropped, so an email, a
 * password or a card number can never ride along in an allowlisted key.
 */
export type AnalyticsPropertyKind = "id" | "integer" | "boolean";

/** Allowlisted properties per event. Nothing else is ever transmitted. */
export const EVENT_PROPERTIES: Record<AnalyticsEventName, Record<string, AnalyticsPropertyKind>> = {
  event_viewed: {
    event_id: "id",
    is_free: "boolean",
    ticket_tiers: "integer",
    sold_out: "boolean",
  },
  checkout_started: {
    event_id: "id",
    ticket_quantity: "integer",
    total_kobo: "integer",
  },
  order_completed: {
    order_id: "id",
    event_id: "id",
    total_kobo: "integer",
  },
};

export type AnalyticsProperty = string | number | boolean;

export function isAnalyticsEventName(event: string): event is AnalyticsEventName {
  return (ANALYTICS_EVENTS as readonly string[]).includes(event);
}

/** Both the public token and an explicit ingestion host are required. */
export function isAnalyticsConfigured(): boolean {
  return POSTHOG_PROJECT_TOKEN.trim().length > 0 && POSTHOG_INGESTION_HOST.trim().length > 0;
}
