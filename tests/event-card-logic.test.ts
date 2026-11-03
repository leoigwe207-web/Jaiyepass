import { describe, expect, it } from "vitest";
import { decorateEventCards } from "@/lib/event-card-logic";

describe("event card relationship normalization", () => {
  it("converts Supabase related-city, venue and category records to strings", () => {
    const row = {
      id: "event-1", slug: "afrobeats-night", title: "Afrobeats Night",
      starts_at: "2026-12-04T20:00:00Z", is_demo: false, is_free: false,
      city_name: { name: "Abuja" }, venue_name: { name: "Culture Hall" },
      category_name: { slug: "music" },
      ticket_types: [
        { price_kobo: 500000, quantity: 100, sold_count: 5, status: "active", sales_start_at: null, sales_end_at: null },
      ],
    };
    const [event] = decorateEventCards([row as never], Date.parse("2026-11-03T20:00:00Z"));
    expect(event.city_name).toBe("Abuja");
    expect(event.venue_name).toBe("Culture Hall");
    expect(event.category_name).toBe("music");
    expect(event.price_min_kobo).toBe(500000);
  });

  it("handles empty or null joins without exposing objects to React", () => {
    const row = {
      id: "event-2", slug: "comedy", title: "Comedy",
      starts_at: "2026-12-04T20:00:00Z", is_demo: false, is_free: true,
      city_name: null, venue_name: [], category_name: [{ slug: "comedy" }],
      ticket_types: [],
    };
    const [event] = decorateEventCards([row as never]);
    expect(event.city_name).toBeNull();
    expect(event.venue_name).toBeNull();
    expect(event.category_name).toBe("comedy");
  });
});
