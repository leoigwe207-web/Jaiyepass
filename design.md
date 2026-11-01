# JaiyePass — Premium V2 Design System

**Status:** Proposed upgrade specification; not implemented in the live project.
**Scope:** Nationwide Nigerian event discovery, ticket checkout, attendee account, host dashboard, and event-gate scanning.
**Design principle:** Culture-forward editorial ticketing. Warm, credible, modern, and fast; never a generic card-grid startup template.

## Brand positioning
- Name: JaiyePass.
- Promise: **Your pass to a good time.**
- Supporting line: *Discover events across Nigeria. Book securely. Show your pass and enjoy.*
- Voice: confident, useful, playful in small doses; never hype-driven or falsely urgent.
- Nationwide-first: default to **All Nigeria** unless a city is explicitly selected. Provide city/state filters; remember user selection when appropriate.
- Every listing must distinguish real events from clearly marked demo events.

## Existing tokens: preserve and refine
The production source currently defines this palette in `src/app/globals.css`. Maintain naming to reduce unnecessary regressions.

| Token | Value | Use |
|---|---|---|
| `paper` | `#F7F3EA` | Main background |
| `paper-deep` | `#EFE8DB` | Quiet contrast sections |
| `ink` | `#16120E` | Headlines and body |
| `ink-soft` | `#4A443C` | Secondary information |
| `line` | `#D8CFBE` | 1 px dividers |
| `night` | `#1B0F2E` | Event-led dark moments |
| `neon` | `#FF2E63` | Primary CTA accent where contrast permits |
| `neon-deep` | `#D9003F` | Accent hover / legible ink-on-paper |
| `brass` | `#A0741A` | Small editorial accents |
| `success` | `#146B3A` | Verified success states |
| `danger` | `#A11321` | Errors, invalid pass |

**Accessibility:** Check actual foreground/background contrast pairs. Do not use bright pink for thin body text over light backgrounds; use `neon-deep` as appropriate. Status communication must include text/icons, not color alone.

## Typography
- Display: **Fraunces** (existing). Used for hero, featured-event headlines, and major editorial section titles.
- Interface: **Archivo** (existing). Used for navigation, labels, forms, prices, details, and dashboards.
- Hero title: clamp(2.8rem, 6vw, 5.8rem), tight leading (~1.0).
- Section headers: clamp(1.65rem, 3vw, 2.8rem), leading 1.1–1.2.
- Event title: 1.05–1.45rem depending on card width.
- Body: 1rem/1.55; metadata minimum 0.875rem, never below legible contrast.
- Prices and dates use tabular numbers where it aids scanning.

## Spacing and layout
- Four-point spacing grid: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.
- Content widths: max 1200–1280 px on public pages, narrower for checkout and forms.
- Mobile gutters: 16–20 px; desktop gutters: 24–40 px.
- Section rhythm: 56–80 px on desktop, 36–56 px mobile.
- Favor confident whitespace, photography, and editorial rules over nested cards.
- Keep one clearly dominant CTA per screen.
- Buttons and interactive controls: recommended touch target at least 44×44 px.
- Cards: existing CSS token uses 4 px radii; legacy design brief describes 16 px. **Standardize** around a restrained 4–8 px editorial radius, with exceptions only for icon buttons/avatars. Avoid random pill proliferation.

## Homepage information architecture
1. Sticky minimal header: JaiyePass, Explore, Cities, Host an Event, Tickets/profile.
2. Strong hero: headline, search term, **All Nigeria** default location control, Explore Events CTA; featured editorial event artwork if a genuine or demo-labeled event exists.
3. Curated first row: upcoming, real or clearly-labeled demo listings, immediately scannable on small screens.
4. Category navigation: Music, Nightlife, Comedy, Culture, Business, Food, Tech, Sports.
5. Discover by city: Lagos, Abuja, Port Harcourt, Ibadan, and other supported Nigerian cities; data-driven, not hardcoded.
6. This weekend / Free / Under ₦10,000 (show only when matching valid priced inventory exists).
7. Crew Links preview: one visual, one sentence, one meaningful CTA.
8. Host value proposition: create events, manage sales, scan entrants.
9. Trust footer: contact/support, refunds, Terms, Privacy, verified-payment status only when true.

## Event-card anatomy
- Event art: consistent 3:2 crop for cards, high-quality originals with fallback poster.
- Category/verified badge only when backed by data.
- Month/day location and event title prominently visible.
- Bottom line: city / venue, and **From ₦X** or **Free**.
- Availability must reflect real open sales window + actual remaining inventory. Never mark an event “Few left” on stale data.
- Clearly visible `Demo event` label for fictional listings.
- Entire card keyboard-focusable; focused outline visible; no overlapping click zones.

## Event-detail page
- Above fold: artwork, title, date/time with timezone, city, venue, primary Get Tickets CTA.
- Core content: organizer identity, event details, ticket tiers, applicable service charges, refund and entrance rules, share link, accessible map link.
- Mobile: sticky purchase bar with selected price + action, not covering content or OS navigation.
- Ticket picker: explicit quantity, remaining stock when meaningful, fee breakdown before redirect.
- Empty/sold-out states explain the next action without fake urgency.

## Mobile-first rules
- Test 320, 375, 390, 768 px and desktop, plus zoom 200%.
- Homepage card carousels use scroll snap and visible overflow cue; no hidden mandatory actions.
- Use native select for city filters where it improves accessibility.
- Mobile nav must expose search, Explore, Tickets, and Host in 1–2 taps.
- Forms: readable input font >= 16px, inline error assistance, numeric keyboards for quantity where appropriate.
- Checkout: single-column purchase summary, transparent fees, large primary CTA; loading and failed payments states.
- QR ticket: uncluttered high-contrast panel, attendee/event summary, explicit status, download/share only when allowed.

## Animation & performance
- Prefer native CSS + Motion for short entrance/state transitions; GSAP only for distinct editorial sequences with measured benefit.
- Standard hover/focus: 120–180 ms. Section reveal: 220–320 ms, subtle translations under 16 px.
- Respect `prefers-reduced-motion`; never gate important content on animation.
- Avoid mandatory smooth-scroll effects on checkout/scanner pages.
- Optimize poster formats with Next.js Image and truthful source rights. Use skeletons sparingly.
- Aim for Core Web Vitals passing on mid-range Android mobile; verify, do not assume scores.

## Dashboard design
- Attendee: simple Tickets, Saved, Orders, Profile; most recent ticket first.
- Host: serious operational UI—summary, Events, Orders, Attendees, Scanner, Payouts, Settings.
- Admin: auditability and permissions first; use tables over decorative KPI tiles where comparison matters.
- QR scanning: large result surface; explicit Valid / Already used / Invalid / Wrong event states and timestamps.

## Component specification
- `SiteHeader`: desktop + mobile navigation, accessible route/expanded state.
- `HomeSearch`: search term + nationwide location, real query parameter encoding.
- `EventCard`: responsive poster, metadata, price, availability, demo indicator.
- `EventFeature`: high-impact flagship event layout with real inventory.
- `TicketPicker`: controlled tier and quantity, breakdown, availability.
- `StatusView`: empty/error/loading states with meaningful recovery action.
- `QrTicket`: printable scannable pass and clear anti-screenshot context; no PII in QR payload.

## Engineering handoff and acceptance
- Preserve existing route names, server pricing, verified Paystack semantics, HMAC QR model, and working Supabase policies.
- Fix mismatch between current location defaults/SEO and nationwide target.
- Standardize design radius, typography scale, and image treatment.
- Test keyboard and screen reader paths, reduced motion, responsive clipping, and actual purchase/scan states.
- No fabricated social proof, sales counts, verified organizer badges, or fake events presented as real.
- Add real screenshots and Lighthouse reports after deployment; until then, no performance or completion claims.
