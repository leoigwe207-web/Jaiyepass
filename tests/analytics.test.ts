import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// The SDK is replaced by an in-memory spy: no network, no browser needed. The
// application modules under test are the real ones (no mirrors).
const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));

// Fixed synthetic configuration. Never a real project token (no phc_/phx_ prefix)
// and a host under the reserved .invalid TLD, so nothing could be delivered even
// if the SDK were not mocked.
const SYNTHETIC_TOKEN = "synthetic-project-token";
const SYNTHETIC_HOST = "https://posthog.invalid";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const ANON_ID = "44444444-4444-4444-8444-444444444444";

const storage = new Map<string, string>();

function installWindow() {
  (globalThis as unknown as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
      clear: () => storage.clear(),
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      get length() {
        return storage.size;
      },
    },
  };
}

function removeWindow() {
  delete (globalThis as unknown as { window?: unknown }).window;
}

/** Fresh copies of the real modules, re-reading the injected configuration. */
async function loadAnalytics() {
  vi.resetModules();
  const client = await import("@/lib/analytics/client");
  const events = await import("@/lib/analytics/events");
  const consent = await import("@/lib/analytics/consent");
  const config = await import("@/lib/analytics/config");
  return { ...client, ...events, ...consent, ...config };
}

function initConfig(): Record<string, unknown> {
  const call = posthogMock.init.mock.calls[0] as unknown as [string, Record<string, unknown>];
  return call[1];
}

beforeEach(() => {
  vi.clearAllMocks();
  storage.clear();
  installWindow();
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = SYNTHETIC_TOKEN;
  process.env.NEXT_PUBLIC_POSTHOG_HOST = SYNTHETIC_HOST;
});

afterEach(() => {
  removeWindow();
  vi.restoreAllMocks();
});

describe("analytics configuration", () => {
  it("does nothing without a project token", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    const a = await loadAnalytics();

    expect(a.isAnalyticsConfigured()).toBe(false);
    a.initAnalytics();
    a.trackEventViewed({ eventId: EVENT_ID, isFree: false, ticketTiers: 2, soldOut: false });

    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("does nothing without an explicit ingestion host", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const a = await loadAnalytics();

    expect(a.isAnalyticsConfigured()).toBe(false);
    a.initAnalytics();
    a.trackCheckoutStarted({ eventId: EVENT_ID, ticketQuantity: 1, totalKobo: 5000 });

    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("initialises with the pinned privacy defaults and starts opted out", async () => {
    const a = await loadAnalytics();
    a.initAnalytics();

    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    const [token, config] = posthogMock.init.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(token).toBe(SYNTHETIC_TOKEN);
    expect(config.api_host).toBe(SYNTHETIC_HOST);
    expect(config.opt_out_capturing_by_default).toBe(true);
    expect(config.autocapture).toBe(false);
    expect(config.capture_pageview).toBe(false);
    expect(config.capture_pageleave).toBe(false);
    expect(config.capture_dead_clicks).toBe(false);
    expect(config.disable_session_recording).toBe(true);
    expect(config.disable_surveys).toBe(true);
    expect(config.advanced_disable_flags).toBe(true);
    expect(typeof config.before_send).toBe("function");
    expect(config.before_send).toBe(a.scrubCaptureResult);

    // No decision yet ⇒ opted out, and no event leaves the browser.
    expect(posthogMock.opt_out_capturing).toHaveBeenCalled();
    expect(posthogMock.opt_in_capturing).not.toHaveBeenCalled();
    a.trackEventViewed({ eventId: EVENT_ID, isFree: false, ticketTiers: 2, soldOut: false });
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("sends nothing when analytics consent is denied", async () => {
    const a = await loadAnalytics();
    a.setAnalyticsConsent("denied");
    a.initAnalytics();

    expect(posthogMock.opt_out_capturing).toHaveBeenCalled();
    expect(posthogMock.opt_in_capturing).not.toHaveBeenCalled();
    a.trackOrderCompleted({ orderId: ORDER_ID, eventId: EVENT_ID, totalKobo: 10_250 });
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("applies a granted decision and consent changes made later", async () => {
    const a = await loadAnalytics();
    a.initAnalytics();
    posthogMock.opt_in_capturing.mockClear();

    a.setAnalyticsConsent("granted");
    expect(posthogMock.opt_in_capturing).toHaveBeenCalledTimes(1);

    a.setAnalyticsConsent("denied");
    expect(posthogMock.opt_out_capturing).toHaveBeenCalledTimes(2); // init + change
    a.trackEventViewed({ eventId: EVENT_ID, isFree: true, ticketTiers: 1, soldOut: false });
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });
});

describe("instrumented actions", () => {
  async function grantedClient() {
    const a = await loadAnalytics();
    a.setAnalyticsConsent("granted");
    a.initAnalytics();
    posthogMock.capture.mockClear();
    return a;
  }

  it("emits each real action once with allowlisted properties only", async () => {
    const a = await grantedClient();

    a.trackEventViewed({ eventId: EVENT_ID, isFree: false, ticketTiers: 2, soldOut: false });
    a.trackCheckoutStarted({ eventId: EVENT_ID, ticketQuantity: 2, totalKobo: 10_250 });
    a.trackOrderCompleted({ orderId: ORDER_ID, eventId: EVENT_ID, totalKobo: 10_250 });

    expect(posthogMock.capture).toHaveBeenCalledTimes(3);
    expect(posthogMock.capture.mock.calls[0]).toEqual([
      "event_viewed",
      { event_id: EVENT_ID, is_free: false, ticket_tiers: 2, sold_out: false },
    ]);
    expect(posthogMock.capture.mock.calls[1]).toEqual([
      "checkout_started",
      { event_id: EVENT_ID, ticket_quantity: 2, total_kobo: 10_250 },
    ]);
    expect(posthogMock.capture.mock.calls[2]).toEqual([
      "order_completed",
      { order_id: ORDER_ID, event_id: EVENT_ID, total_kobo: 10_250 },
    ]);
    // Property allowlists, per event — nothing extra is attached.
    expect(Object.keys(posthogMock.capture.mock.calls[0]![1] as object).sort()).toEqual([
      "event_id",
      "is_free",
      "sold_out",
      "ticket_tiers",
    ]);
    expect(Object.keys(posthogMock.capture.mock.calls[1]![1] as object).sort()).toEqual([
      "event_id",
      "ticket_quantity",
      "total_kobo",
    ]);
    expect(Object.keys(posthogMock.capture.mock.calls[2]![1] as object).sort()).toEqual([
      "event_id",
      "order_id",
      "total_kobo",
    ]);
  });

  it("drops email, password, token and card sentinels from allowlisted keys", async () => {
    const a = await grantedClient();

    a.captureAnalyticsEvent("event_viewed", {
      event_id: "attendee@example.com",
      is_free: "hunter2-letmein",
      ticket_tiers: 4242424242424242,
      sold_out: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2VjcmV0",
    });

    // Every value is the wrong kind for its allowlisted key, so none is sent.
    expect(posthogMock.capture).toHaveBeenCalledWith("event_viewed", {});
    const [, properties] = posthogMock.capture.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(JSON.stringify(properties)).not.toMatch(/@|hunter2|4242424242424242|eyJhbGci/);
  });

  it("keeps the caller's result when the transport throws", async () => {
    const a = await grantedClient();
    posthogMock.capture.mockImplementationOnce(() => {
      throw new Error("network down");
    });

    expect(() =>
      a.trackCheckoutStarted({ eventId: EVENT_ID, ticketQuantity: 1, totalKobo: 5000 }),
    ).not.toThrow();
    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
  });
});

describe("before_send scrubbing", () => {
  it("discards automatic events that are not in the contract", async () => {
    const a = await loadAnalytics();

    const pageview = a.scrubCaptureResult({
      uuid: "u1",
      event: "$pageview",
      properties: { $current_url: "https://jaiyepass.com/events?email=attendee@example.com" },
    });
    const autocapture = a.scrubCaptureResult({
      uuid: "u2",
      event: "$autocapture",
      properties: { $current_url: "https://jaiyepass.com/events" },
    });
    const exception = a.scrubCaptureResult({
      uuid: "u3",
      event: "$exception",
      properties: { $exception_message: "card declined 4242424242424242" },
    });

    expect(pageview).toBeNull();
    expect(autocapture).toBeNull();
    expect(exception).toBeNull();
  });

  it("strips URL, referrer and person metadata from contract events", async () => {
    const a = await loadAnalytics();

    const result = a.scrubCaptureResult({
      uuid: "u4",
      event: "event_viewed",
      properties: {
        distinct_id: ANON_ID,
        event_id: EVENT_ID,
        is_free: true,
        ticket_tiers: 1,
        sold_out: false,
        $current_url: "https://jaiyepass.com/events/lagos-night?email=attendee@example.com",
        $referrer: "https://mail.google.com/mail/u/0/?password=hunter2",
        $pathname: "/events/lagos-night",
        $host: "jaiyepass.com",
        email: "attendee@example.com",
        card: "4242424242424242",
      },
      $set: { email: "attendee@example.com" },
    });

    expect(result).not.toBeNull();
    const properties = result!.properties as Record<string, unknown>;
    expect(properties).toEqual({
      distinct_id: ANON_ID,
      event_id: EVENT_ID,
      is_free: true,
      ticket_tiers: 1,
      sold_out: false,
    });
    expect(result!.$set).toBeUndefined();
    expect(JSON.stringify(result)).not.toMatch(/@|hunter2|4242424242424242|mail\.google|\$current_url|\$referrer/);
  });

  it("passes $identify through with merge ids only", async () => {
    const a = await loadAnalytics();

    const result = a.scrubCaptureResult({
      uuid: "u5",
      event: "$identify",
      properties: {
        distinct_id: USER_ID,
        $anon_distinct_id: ANON_ID,
        $current_url: "https://jaiyepass.com/account/tickets",
      },
      $set: { email: "attendee@example.com", full_name: "Demo Attendee" },
    });

    expect(result).not.toBeNull();
    expect(result!.properties).toEqual({ distinct_id: USER_ID, $anon_distinct_id: ANON_ID });
    expect(result!.$set).toBeUndefined();
  });
});

describe("identity", () => {
  it("identifies with the opaque auth id and never an email", async () => {
    const a = await loadAnalytics();
    a.setAnalyticsConsent("granted");
    a.initAnalytics();

    a.identifyAttendee(USER_ID);
    expect(posthogMock.identify).toHaveBeenCalledTimes(1);
    expect(posthogMock.identify).toHaveBeenCalledWith(USER_ID);

    a.identifyAttendee("attendee@example.com");
    expect(posthogMock.identify).toHaveBeenCalledTimes(1);
  });

  it("resets on sign-out and keeps an already-granted consent", async () => {
    const a = await loadAnalytics();
    a.setAnalyticsConsent("granted");
    a.initAnalytics();
    posthogMock.opt_in_capturing.mockClear();

    a.forgetAttendee();
    expect(posthogMock.reset).toHaveBeenCalledTimes(1);

    // PostHog clears consent on reset, so the client opts back in afterwards.
    const resetOrder = posthogMock.reset.mock.invocationCallOrder[0]!;
    const optInOrder = posthogMock.opt_in_capturing.mock.invocationCallOrder[0]!;
    expect(optInOrder).toBeGreaterThan(resetOrder);

    a.trackEventViewed({ eventId: EVENT_ID, isFree: true, ticketTiers: 1, soldOut: false });
    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
  });
});

describe("installation evidence", () => {
  const root = process.cwd();

  it("pins posthog-js 1.438.13 in the manifest and the npm lock", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8")) as {
      lockfileVersion: number;
      packages: Record<string, { version?: string; dependencies?: Record<string, string> }>;
    };

    expect(pkg.dependencies["posthog-js"]).toBe("1.438.13");
    expect(lock.lockfileVersion).toBe(3);
    expect(lock.packages[""]?.dependencies?.["posthog-js"]).toBe("1.438.13");
    expect(lock.packages["node_modules/posthog-js"]?.version).toBe("1.438.13");
  });
});
