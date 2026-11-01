// Single PostHog browser client for JaiyePass.
//
// Privacy defaults: opted out until the visitor grants consent, no autocapture,
// no pageviews/pageleaves/dead clicks, no session replay, no surveys, no error
// collection, no feature flags. Everything outside the event contract in
// ./config is dropped twice: here and in `before_send`.
//
// Missing project token / ingestion host ⇒ this module never initialises the
// SDK and every helper is a no-op. Nothing analytics-related is allowed to
// throw into the app.

import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";
import {
  EVENT_PROPERTIES,
  POSTHOG_INGESTION_HOST,
  POSTHOG_PROJECT_TOKEN,
  isAnalyticsConfigured,
  isAnalyticsEventName,
  type AnalyticsEventName,
  type AnalyticsProperty,
  type AnalyticsPropertyKind,
} from "./config";
import { getAnalyticsConsent, onAnalyticsConsentChange, type AnalyticsConsent } from "./consent";

/** Opacity guard: ids/strings must look like `uuid`, `jp_abc` or similar. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Money in kobo stays far below this; a card number never does. */
const MAX_SAFE_NUMBER = 1_000_000_000;

/** Core fields PostHog needs to store an event at all (all opaque). */
const CORE_PROPERTIES = ["distinct_id", "$anon_distinct_id", "$session_id"];

let started = false;

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID.test(value);
}

/**
 * Accepts only a value of the declared kind: an opaque id string, a small
 * non-negative integer, or a boolean. Everything else is dropped.
 */
export function sanitizeAnalyticsValue(
  value: unknown,
  kind: AnalyticsPropertyKind,
): AnalyticsProperty | null {
  if (kind === "boolean") return typeof value === "boolean" ? value : null;
  if (kind === "integer") {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MAX_SAFE_NUMBER
      ? value
      : null;
  }
  return typeof value === "string" && SAFE_ID.test(value) ? value : null;
}

/** Allowlisted properties for one event, with unsafe values removed. */
export function sanitizeAnalyticsProperties(
  event: AnalyticsEventName,
  properties: Record<string, unknown>,
): Record<string, AnalyticsProperty> {
  const clean: Record<string, AnalyticsProperty> = {};
  for (const [key, kind] of Object.entries(EVENT_PROPERTIES[event])) {
    const value = sanitizeAnalyticsValue(properties[key], kind);
    if (value !== null) clean[key] = value;
  }
  return clean;
}

/**
 * `before_send` hook: strips automatic URL/referrer/person metadata, drops every
 * event outside the contract, and keeps only opaque core fields. Returns null to
 * discard the event entirely.
 */
export function scrubCaptureResult(result: CaptureResult): CaptureResult | null {
  const event = String(result.event);

  if (event === "$identify") {
    // PostHog needs the merge fields; person properties are never sent.
    const properties: Record<string, unknown> = {};
    for (const key of CORE_PROPERTIES) {
      if (isSafeId(result.properties?.[key])) properties[key] = result.properties[key];
    }
    return { ...result, properties, $set: undefined, $set_once: undefined, $unset: undefined };
  }

  // Pageviews, autocapture, dead clicks, exceptions, flag calls: none of these
  // are part of the product question, so nothing leaves the browser.
  if (!isAnalyticsEventName(event)) return null;

  const properties: Record<string, AnalyticsProperty> = {};
  for (const key of CORE_PROPERTIES) {
    const value = result.properties?.[key];
    if (isSafeId(value)) properties[key] = value;
  }
  Object.assign(properties, sanitizeAnalyticsProperties(event, result.properties ?? {}));

  return { ...result, properties, $set: undefined, $set_once: undefined, $unset: undefined };
}

function applyConsent(decision: AnalyticsConsent): void {
  if (!started) return;
  try {
    if (decision === "granted") {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
  } catch {
    // Consent plumbing must never break the page.
  }
}

/**
 * Start the client once, from `instrumentation-client.ts`. Safe to call more
 * than once and safe when analytics is not configured.
 */
export function initAnalytics(): void {
  if (started) return;
  if (typeof window === "undefined") return;
  if (!isAnalyticsConfigured()) return;

  try {
    posthog.init(POSTHOG_PROJECT_TOKEN, {
      api_host: POSTHOG_INGESTION_HOST,
      // Privacy defaults — this client only ever sends the event contract.
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      capture_performance: false,
      capture_exceptions: false,
      advanced_disable_flags: true,
      person_profiles: "identified_only",
      persistence: "localStorage",
      opt_out_capturing_by_default: true,
      opt_out_capturing_persistence_type: "localStorage",
      before_send: scrubCaptureResult,
    });
  } catch {
    return; // No analytics for this page view; the app carries on.
  }

  started = true;
  applyConsent(getAnalyticsConsent());
  // The client lives for the page's lifetime; consent changes apply live.
  onAnalyticsConsentChange(applyConsent);
}

/** Capture one contract event. No-op without configuration or consent. */
export function captureAnalyticsEvent(
  event: AnalyticsEventName,
  properties: Record<string, unknown>,
): void {
  if (!started || getAnalyticsConsent() !== "granted") return;
  const clean = sanitizeAnalyticsProperties(event, properties);
  try {
    posthog.capture(event, clean);
  } catch {
    // Transport failures are harmless: the user's action already succeeded.
  }
}

/** Identify with an opaque auth id only — never an email or a display name. */
export function identifyAnalyticsUser(distinctId: string): void {
  if (!started || getAnalyticsConsent() !== "granted") return;
  if (!isSafeId(distinctId)) return;
  try {
    posthog.identify(distinctId);
  } catch {
    // Ignored.
  }
}

/** Drop the identity on sign-out. PostHog clears consent on reset, so re-apply it. */
export function resetAnalytics(): void {
  if (!started) return;
  try {
    posthog.reset();
  } catch {
    return;
  }
  applyConsent(getAnalyticsConsent());
}
