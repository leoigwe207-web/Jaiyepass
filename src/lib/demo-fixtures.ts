/**
 * Sample dashboard data for preview demo mode (spec §3).
 * Everything here is fictional, labelled "(Demo)" in the UI, and never
 * represents real transactions. Nothing in this file is persisted anywhere.
 */

export const DEMO_EVENT_IDS = {
  rooftop: "00000000-0000-4000-8000-00000000d001",
  abujaFest: "00000000-0000-4000-8000-00000000d002",
} as const;

/** Demo QR payloads drive the simulated scanner in /api/scan (demo branch). */
export const DEMO_QR = {
  valid: "demo.ticket.preview-valid",
  used: "demo.ticket.preview-used",
  wrongEvent: "demo.ticket.preview-wrong-event",
  garbage: "not-a-jaiyepass-ticket",
} as const;

const DAY = 24 * 3600 * 1000;

function inDays(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString();
}

export interface DemoTicketRow {
  id: string;
  status: string;
  used_at: string | null;
  payload: string;
  event: {
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string;
    is_demo: boolean;
    venue_name: string | null;
    city_name: string | null;
  } | null;
  ticket_type_name: string;
}

/** Attendee — My Tickets (spec §6). */
export function demoAttendeeTickets(): DemoTicketRow[] {
  return [
    {
      id: "00000000-0000-4000-8000-00000000a001",
      status: "issued",
      used_at: null,
      payload: DEMO_QR.valid,
      ticket_type_name: "General Admission",
      event: {
        title: "Afrobeats Rooftop Sessions (Demo)",
        slug: "afrobeats-rooftop-sessions-demo",
        starts_at: inDays(3),
        ends_at: new Date(Date.now() + 3 * DAY + 4 * 3600 * 1000).toISOString(),
        is_demo: true,
        venue_name: "Skyline Terrace",
        city_name: "Lagos",
      },
    },
    {
      id: "00000000-0000-4000-8000-00000000a002",
      status: "used",
      used_at: inDays(-2),
      payload: DEMO_QR.used,
      ticket_type_name: "VIP Table (Demo)",
      event: {
        title: "Abuja Food & Music Festival (Demo)",
        slug: "abuja-food-music-festival-demo",
        starts_at: new Date(Date.now() - 3 * DAY).toISOString(),
        ends_at: new Date(Date.now() - 3 * DAY + 6 * 3600 * 1000).toISOString(),
        is_demo: true,
        venue_name: "Unity Gardens",
        city_name: "Abuja",
      },
    },
  ];
}

export interface DemoHostOverview {
  org: { name: string; verification: string };
  stats: { events: number; ticketsSold: number; grossKobo: number; checkIns: number; pendingReview: number };
  recentSales: { id: string; title: string; totalKobo: number; at: string }[];
  refundQueue: { id: string; title: string; amountKobo: number; at: string }[];
}

/** Host — dashboard overview (spec §7). */
export function demoHostOverview(): DemoHostOverview {
  return {
    org: { name: "Nightshift Collective (Demo)", verification: "pending" },
    stats: { events: 4, ticketsSold: 312, grossKobo: 124_000_000, checkIns: 186, pendingReview: 1 },
    recentSales: [
      { id: "s1", title: "Afrobeats Rooftop Sessions (Demo)", totalKobo: 45_000_000, at: inDays(-1) },
      { id: "s2", title: "Lagos Comedy Club Night (Demo)", totalKobo: 39_000_000, at: inDays(-2) },
      { id: "s3", title: "Startup Mixer Ibadan (Demo)", totalKobo: 40_000_000, at: inDays(-4) },
    ],
    refundQueue: [{ id: "r1", title: "Lagos Comedy Club Night (Demo)", amountKobo: 3_000_000, at: inDays(-1) }],
  };
}

export interface DemoScannerEvent {
  id: string;
  title: string;
  starts_at: string;
}

/** Scanner — assigned events (spec §8). */
export function demoScannerEvents(): DemoScannerEvent[] {
  return [
    { id: DEMO_EVENT_IDS.rooftop, title: "Afrobeats Rooftop Sessions (Demo)", starts_at: inDays(3) },
    { id: DEMO_EVENT_IDS.abujaFest, title: "Abuja Food & Music Festival (Demo)", starts_at: inDays(10) },
  ];
}

export interface DemoScanRow {
  id: string;
  result: string;
  scanned_at: string;
  ticket: { ticket_types: { name: string } | null; profiles: { full_name: string | null } | null } | null;
}

/** Scanner — recent check-in log (spec §8), all fictional. */
export function demoRecentScans(): DemoScanRow[] {
  return [
    {
      id: "c1",
      result: "valid",
      scanned_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      ticket: { ticket_types: { name: "General Admission" }, profiles: { full_name: "Chidi" } },
    },
    {
      id: "c2",
      result: "already_used",
      scanned_at: new Date(Date.now() - 21 * 60 * 1000).toISOString(),
      ticket: { ticket_types: { name: "VIP Table" }, profiles: { full_name: "Amaka" } },
    },
    {
      id: "c3",
      result: "valid",
      scanned_at: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
      ticket: { ticket_types: { name: "General Admission" }, profiles: { full_name: "Tunde" } },
    },
  ];
}

export interface DemoAdminSummary {
  label: string;
  value: string;
  highlight?: boolean;
}

/** Admin — platform summary (spec §9), fictional figures. */
export function demoAdminSummary(): DemoAdminSummary[] {
  return [
    { label: "Attendees", value: "1,284" },
    { label: "Hosts", value: "46" },
    { label: "Events", value: "72" },
    { label: "Orders", value: "2,140" },
    { label: "Gross sales", value: "₦18,450,000", highlight: true },
    { label: "Check-ins", value: "1,366" },
    { label: "Refunds pending", value: "3" },
    { label: "Payouts pending", value: "₦2,100,000" },
  ];
}

export interface DemoReviewItem {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  created_at: string;
  org: { name: string; verification: string; contact_email: string };
  city: { name: string } | null;
  ticket_types: { name: string; price_kobo: number; quantity: number }[];
}

/** Admin — review queue (spec §9). Approve/reject are disabled in demo mode. */
export function demoReviewQueue(): DemoReviewItem[] {
  return [
    {
      id: "00000000-0000-4000-8000-00000000e001",
      title: "Port Harcourt Boat Party (Demo)",
      description:
        "An hour-long cruise along the Bonny channel with a live DJ and small plates. Demo listing — not a real event.",
      starts_at: inDays(9),
      created_at: inDays(-2),
      org: { name: "Delta Nights (Demo)", verification: "pending", contact_email: "hosts@jaiyepass.demo" },
      city: { name: "Port Harcourt" },
      ticket_types: [
        { name: "Deck", price_kobo: 750_000, quantity: 120 },
        { name: "VIP Deck", price_kobo: 1_500_000, quantity: 30 },
      ],
    },
    {
      id: "00000000-0000-4000-8000-00000000e002",
      title: "Enugu Comedy Open Mic (Demo)",
      description:
        "Open mic night with eight slots and a headline closer. Demo listing — not a real event.",
      starts_at: inDays(14),
      created_at: inDays(-1),
      org: { name: "Eastside Laughs (Demo)", verification: "verified", contact_email: "hello@jaiyepass.demo" },
      city: { name: "Enugu" },
      ticket_types: [{ name: "Standard", price_kobo: 200_000, quantity: 90 }],
    },
  ];
}
