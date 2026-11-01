// Analytics consent, stored client-side only. Fail-closed: no stored decision
// means "not granted", and the banner in components/analytics asks once.
//
// There was no consent-management platform in this app before, so this is the
// single source of truth for the PostHog decision (and nothing else).

export type AnalyticsConsent = "granted" | "denied" | null;

export const ANALYTICS_CONSENT_KEY = "jaiyepass.analytics.consent.v1";

type Listener = (consent: AnalyticsConsent) => void;

// Memory copy: also the fallback when storage is unavailable (SSR, tests,
// private-mode browsers that throw on localStorage access).
let current: AnalyticsConsent = null;
const listeners = new Set<Listener>();

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function parse(value: string | null | undefined): AnalyticsConsent {
  return value === "granted" || value === "denied" ? value : null;
}

/** The visitor's stored decision, or null when they have not decided yet. */
export function getAnalyticsConsent(): AnalyticsConsent {
  const store = storage();
  if (!store) return current;
  try {
    return parse(store.getItem(ANALYTICS_CONSENT_KEY));
  } catch {
    return null;
  }
}

/** Record a decision and notify the analytics client. Never throws. */
export function setAnalyticsConsent(decision: Exclude<AnalyticsConsent, null>): void {
  current = decision;
  const store = storage();
  if (store) {
    try {
      store.setItem(ANALYTICS_CONSENT_KEY, decision);
    } catch {
      // Storage refused (quota/private mode): the decision still applies to
      // this page view through the in-memory copy.
    }
  }
  for (const listener of listeners) {
    try {
      listener(decision);
    } catch {
      // A broken listener must not block consent from being applied.
    }
  }
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function onAnalyticsConsentChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
