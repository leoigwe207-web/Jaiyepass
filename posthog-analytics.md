# PostHog product analytics

Product analytics for JaiyePass (event discovery + ticketing). PostHog is used for **one**
question only, with an explicit event contract, opt-in consent and no replays, surveys, error
collection or feature flags.

## Product question

> Of the people who open a Lagos event page that still has tickets for sale, how many start a
> checkout, and how many complete a paid order — within 14 days?

A start/success funnel: `event_viewed` → `checkout_started` → `order_completed`.

## Events

| # | Event | Real action it marks | Where it fires |
|---|---|---|---|
| 1 | `event_viewed` | An event detail page renders with at least one ticket type on sale | `src/app/events/[slug]/page.tsx` renders `EventViewed` (`src/components/analytics/analytics.tsx`) |
| 2 | `checkout_started` | The ticket picker created a pending order server-side and is redirecting to `/checkout/[orderId]` | `startCheckout()` in `src/components/ticket-picker.tsx` |
| 3 | `order_completed` | The payment-return page shows a **paid** order for the signed-in attendee | `src/app/checkout/[orderId]/success/page.tsx` renders `OrderCompleted` (only on the paid branch) |

No other events are sent: auto-capture, pageviews, pageleaves, dead clicks, replays, surveys,
exceptions and feature-flag calls are all disabled, and `before_send` drops anything outside
this contract (except the SDK's own `$identify`, which is stripped to its merge fields).

## Triggers (real files / functions)

- `src/components/ticket-picker.tsx` → `startCheckout()` — after `POST /api/checkout` returns
  `orderId`, before `router.push("/checkout/" + orderId)`.
- `src/app/events/[slug]/page.tsx` → `EventViewed` client component — `useEffect` on mount,
  only when tickets are on sale (the sold-out branch does not render it).
- `src/app/checkout/[orderId]/success/page.tsx` → `OrderCompleted` client component — paid
  branch only; it also identifies the signed-in attendee.
- `src/components/logout-button.tsx` → `forgetAttendee()` — clears the PostHog identity on
  sign-out (both the Supabase and preview-demo sign-out paths).

Event emitters live in `src/lib/analytics/events.ts`; the client wrapper is
`src/lib/analytics/client.ts`; consent storage is `src/lib/analytics/consent.ts`; the contract
itself (event names + property allowlist) is `src/lib/analytics/config.ts`.

## Allowed properties

Only these properties are ever sent; everything else is stripped by the wrapper **and** by
`before_send`.

| Event | Properties |
|---|---|
| `event_viewed` | `event_id` (UUID), `is_free` (bool), `ticket_tiers` (count), `sold_out` (bool) |
| `checkout_started` | `event_id` (UUID), `ticket_quantity` (count), `total_kobo` (int) |
| `order_completed` | `order_id` (UUID), `event_id` (UUID), `total_kobo` (int) |

Value guard: strings must look like an opaque id (`[A-Za-z0-9_-]{1,64}`), numbers must be finite
and below 1e9, booleans pass. Emails, names, passwords, tokens and card numbers cannot pass that
guard, and automatic URL/referrer/person metadata (`$current_url`, `$referrer`, `$pathname`,
`$host`, `$set`, `$set_once`, `$unset`, `$ip`) is removed in `before_send`.

## Identity

- Anonymous by default; PostHog's generated distinct id is used.
- On the paid-order page the attendee is identified with the **Supabase user UUID only**
  (`identifyAttendee(user.id)`) and no person properties. PostHog merges the earlier anonymous
  events into that person, so the funnel spans anonymous → identified.
- `forgetAttendee()` calls `reset()` on sign-out and re-applies an already-granted consent
  (PostHog clears consent on reset, and this client starts opted out).
- No emails, names, phone numbers or payment references are sent as identifiers.

## Consent

- `opt_out_capturing_by_default: true` — no decision means **off**, there is no cookieless
  fallback and no capture before a decision.
- The decision lives in `localStorage` under `jaiyepass.analytics.consent.v1`
  (`granted` / `denied`) and is collected by the banner in
  `src/components/analytics/analytics.tsx`, rendered from `src/app/layout.tsx`. It is not an
  existing CMP — the app had none.
- `opt_in_capturing()` / `opt_out_capturing()` are wired to that decision, including changes
  made after the client started.
- `/privacy` already told visitors "No advertising trackers are set without consent"; that
  promise is now enforced in code.

## Configuration

| Variable | Scope | Meaning |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | browser (public) | PostHog **project** token. Empty ⇒ analytics is a no-op. |
| `NEXT_PUBLIC_POSTHOG_HOST` | browser (public) | Ingestion host: `https://us.i.posthog.com`, `https://eu.i.posthog.com`, or the self-hosted ingestion domain. Empty/unknown ⇒ capture stays off. |

Placeholders live in `.env.example`; real values go in `.env.local` (git-ignored, never read by
this change). No token is hardcoded anywhere in the source, tests or this note.

## Live analysis

Build this insight in the PostHog project (no insight is created by code):

- **Type:** Funnel (ordered, unique users).
- **Steps:** `event_viewed` → `checkout_started` → `order_completed`.
- **Denominator:** unique users with `event_viewed` inside the window (step 1 = 100%).
- **Timeframe:** last 14 days (rolling), conversion window 14 days.
- **Success measure:** step 3 conversion rate = `order_completed` users ÷ `event_viewed` users.
- **Reading it:** step 1→2 drop-off is the ticket-picker/price problem; step 2→3 drop-off is
  the payment/hold-expiry problem. A funnel step with zero users means the journey was not
  exercised, not that the event is broken — the offline checks in
  `tests/analytics.test.ts` prove the emit path.

## Repository / toolchain evidence

| Fact | Value |
|---|---|
| Package manager | `npm` (`packageManager` not pinned in `package.json`; no `yarn.lock`, no `pnpm-lock.yaml`, no `bun.lockb`) |
| Original lock | `package-lock.json`, `lockfileVersion: 3`, root importer `.` (`jaiyepass`) |
| Owning package / importer | repository root — the single app; `posthog-js` added to root `dependencies` |
| Framework | Next.js `15.5.28` (App Router, `src/app`, React 19) |
| Node / npm | `v24.21.0` / `11.19.0` |
| TypeScript / Vitest | `^5.9.2` / `^3.2.4` |
| Typecheck command | `npm run typecheck` (`tsc --noEmit`) |
| Test command | `npm test` (`vitest run`, `tests/**/*.test.ts`, node environment) |
| Lint | **none** — `package.json` has no `lint` script and no ESLint config, so there is no lint check to run |
| Build | `npm run build` (`next build`) |

Baseline, before any change (run 2026-10-25): `npm run typecheck` → exit 0; `npm test` → 7 files /
86 tests passed. No pre-existing failures to carry.

## Installed SDK

| Fact | Value |
|---|---|
| Package | `posthog-js` |
| Manifest | root `package.json` → `"posthog-js": "1.438.13"` (exact, `--save-exact`) |
| Lock | `package-lock.json` → `packages["node_modules/posthog-js"].version = "1.438.13"`, same entry in the root importer's `dependencies` |
| Install command | `npm install posthog-js@1.438.13` |
| Init boundary | `instrumentation-client.ts` (Next 15 client bootstrap) → `initAnalytics()` in `src/lib/analytics/client.ts` |
| Bundled with | `next` (single root importer, no workspaces) |

## Offline verification

`node posthog-analytics.verify.mjs` runs `tests/analytics.test.ts` through the repository's own
Vitest (no network, no browser), then re-reads `package.json` / `package-lock.json`:

- child environment starts from `{}` — only OS/path/temp values plus a synthetic project token and
  a synthetic host are injected;
- missing token or missing host ⇒ `posthog.init()` is never called and nothing is captured;
- no consent decision, or a denied decision ⇒ nothing captured;
- granted decision ⇒ each real handler emits exactly once with allowlisted properties only;
- email/password/token/card sentinels and `$current_url`/`$referrer` never leave the client;
- a throwing transport never breaks the caller;
- identity uses the opaque auth id and `reset()` runs on sign-out;
- `posthog-js` stays pinned at `1.438.13` in the manifest and the npm lock.
