# JaiyePass — DESIGN.md

## Design intent
JaiyePass is a Nigerian event-discovery and ticketing product: **lively, credible, fast, editorial**.
The UI should evoke a thoughtfully curated weekend culture magazine, not a generic SaaS template.
Maintain clear Individual / Organizer / Admin separation and existing security logic.

## Visual system
- **Canvas**: warm ivory \`#FCF9F5\` (main); white cards \`#FFFFFF\`.
- **Ink**: nearly black \`#191918\`; muted \`#625F59\`.
- **Accent**: spirited burnt orange \`#D94D2A\`, highlighted use only.
- **Accent surface**: \`#FFF1E8\`; rules \`#E8E2DB\`.
- **Night**: \`#16181D\`; cream foreground.
- **Typography**: Fraunces headlines with Archivo UI typography; use tightly set display sizes and airy body leading.
- **Grid**: 12-column desktop; 2-column mobile cards only where appropriate; 24px mobile gutters, 64px max desktop gutters.
- **Radii**: large editorial visuals 24–36px, product cards 18–22px, controls 12–16px.
- **Density**: use breathing room in marketing, tighter action-oriented density in dashboards.
- **CTA**: one dominant call-to-action per viewport; avoid competing action colors.

## Interaction and motion
- **Lenis**: progressive enhancement for fine-pointer desktop marketing pages only; native scrolling on mobile and authenticated/payment pages.
- **GSAP**: one-time editorial headline entrance, synchronized with Lenis; reduced-motion bypass.
- **Motion.dev**: spring microinteractions, controlled drawer transitions and viewport section reveals.
- **React Bits / Motion Primitives**: use source-inspired orbit, quiet reveal and tactile button patterns; no heavy background canvases or unreviewed dependencies.
- **Devouring Details**: thoughtful responsiveness, ergonomic gestures, clear state transitions, small perceived-performance improvements.
- **Interface Craft / Refero**: high-quality landing-page hierarchy, filtered catalog, mobile drawers, empty states, dense admin information architecture.
- **TypeUI / DESIGN.md resources**: consistent type scale, tokenized radii, focus states, spacing and component behavior.

## Accessibility and safety
- 44px+ touch targets; visible focus state; WCAG AA text contrast.
- Honor \`prefers-reduced-motion\`, keep information visible without JS, no scroll-trapping.
- Do not animate critical form feedback, QR scanning targets, or payment confirmation.
- Never invent fake events or sales metrics. Empty states must still feel intentional.
- Public design upgrades must never loosen authentication, account roles, checkout verification, RLS or admin permissions.

## Screens
- **Home**: cinematic editorial hero, city selectors, live event cards, dynamic empty-state poster.
- **Events**: crisp filter panel and event grid, mobile-first controls.
- **Pricing**: simple fee breakdown, feature cards, confidence-building language.
- **Account**: fewer distractions, clear step-by-step onboarding.
- **Organizer / Admin / Individual**: consistent navigation and calm neutral dashboards, high legibility.

## Sources
Design references and principles (not copied source assets):
Lenis (lenis.dev); GSAP (gsap.com); Motion (motion.dev);
React Bits (reactbits.dev); Motion Primitives (motion-primitives.com);
Devouring Details (devouringdetails.com); Refero (refero.design);
Refero Styles / DESIGN.md (styles.refero.design); TypeUI (typeui.sh);
Interface Craft (conceptual interaction/craft inspiration).
