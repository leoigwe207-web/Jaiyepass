# JaiyePass — Design Brief

**Positioning:** premium-but-warm nightlife culture, distinctly Lagos — editorial energy with the
precision of a ticket stub. Not a copy of any existing ticketing site.

---

## 1. Brand

| Token | Value | Use |
|---|---|---|
| Name | JaiyePass | "Jaiye" (Yoruba: enjoy life) + "Pass" (ticket & access) |
| Tagline | Your pass to a good time. | Hero, emails, onboarding |
| Voice | Confident, warm, local-smart — "For the crew", not "curate your experiential portfolio" |
| Currency | ₦ NGN, integer kobo server-side | Price always whole naira to users |
| City-first | Lagos first; city is a first-class filter everywhere | Multi-city ready |

## 2. Visual system

- **Type:** Fraunces (display/headlines — warm, high-contrast serif) + a clean grotesque for UI.
  Fraunces carries the editorial personality; never for body copy below 14 px.
- **Color tokens:** `ink` (near-black), `paper` (warm off-white), `neon` (electric accent for
  primary CTAs + live states), `danger/warning/success` for system states only. Dark `night` for
  hover/contrast.
- **Shape:** `rounded-card` everywhere (16 px) with 1 px `line` borders — ticket-stub feel without
  skeuomorphic perforation.
- **Density:** generous whitespace; one idea per screen section; price and date are the two
  highest-contrast data points on any card.
- **Motion:** functional micro-transitions only (150–200 ms). Scanner result uses haptic + full-bleed
  color state — no decorative animation in money flows.

## 3. Layout principles (mobile first)

1. 360 px is the design width; desktop is the enhancement (3/4-col grids, side nav).
2. Sticky primary CTA on event detail ("Reserve · ₦X + fees") once quantities are selected.
3. Never more than two decisions per screen (pick tickets → pay; approve → refund).
4. Tables become stacked cards with labeled rows under 640 px.
5. Empty states always carry a next action (browse, create, invite).

## 4. Page-by-page intent

| Surface | Intent | Notes |
|---|---|---|
| Home | "There's something on this weekend" within 3 s | Hero search, collections rail, featured, city chips |
| Browse | Compare options fast | Filters as horizontal chips + result count; availability from inventory |
| Event detail | Convert to tickets | Poster, date/venue, social proof of plan, ticket picker, trust line (secure checkout) |
| Checkout | Reassure & finish | Order summary locked above fold, fee transparency, hold countdown |
| Success | Celebration + instruction | "You're going to…" + QR access path + share |
| Tickets (account) | Usable at a dark gate | High-contrast QR card, status chip, minimal text |
| Host overview | Business pulse | Balance trio: gross / refunded / available |
| Manage event | Operate from a phone | Sections: tickets, promos, scanners, refunds, attendees |
| Scan | Split-second decision | Huge ✓/✕ state, reason line, name + ticket type only |
| Admin | Judge safely | Queue by age, preview before deciding, destructive actions confirmed |

## 5. Accessibility

- WCAG 2.2 AA: contrast ≥ 4.5:1 (accent used on white only at bold sizes ≥ 14 px), visible focus
  rings, labeled inputs, `role="alert"` for errors, `aria-live` for scan results.
- Keyboard-complete all flows; camera scanner always has a manual fallback.
- Status never conveyed by color alone (icon + text always accompany).
- Reduced-motion respected (`prefers-reduced-motion`).

## 6. Content rules

- Prices: `₦5,000` (no decimals when whole), fees labeled "Service fee" — never hidden.
- Dates: "Sat 12 Dec · 7:00 PM" (en-NG), venue + city on one line.
- Errors: say what happened, then the one action to take.
- Demo content is explicitly badged "Demo listing" until organizers replace it.

## 7. Assets

- Posters: 16:9 or 4:5; local SVG demo posters in `/public/demo/` labeled as stylized.
- Icons: inline SVG, 1.5 px stroke, no icon-font dependency.
- QR: pure black on white, quiet zone respected, 220 px min on phones (scannable at 40 cm).

## 8. What we deliberately avoid

- Purple-gradient hero + centered headline + two buttons
- Cards-inside-cards-inside-cards nesting
- Copying Eventbrite/Quicket/Starlist layouts or brand colors
- Decorative animation anywhere money, tickets, or check-in are involved
