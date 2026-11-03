import type { EventCardDatum } from "@/components/event-card";

export function decorateEventCards(
  rows: (EventCardDatum & {
    ticket_types?: { price_kobo: number; quantity: number; sold_count: number; status: string; sales_start_at: string | null; sales_end_at: string | null }[] | null;
  })[],
  nowMs = Date.now(),
): EventCardDatum[] {
  return rows.map(({ ticket_types, ...rest }) => {
    const relationName = (value: unknown, field: "name" | "slug"): string | null => {
      const record = Array.isArray(value) ? value[0] : value;
      if (typeof record === "string") return record;
      if (record && typeof record === "object" && field in record) {
        const candidate = (record as Record<string, unknown>)[field];
        return typeof candidate === "string" ? candidate : null;
      }
      return null;
    };
    const tickets = ticket_types ?? [];
    const active = tickets.filter((t) => t.status === "active" || t.status === "sold_out");
    const selling = active.filter((t) =>
      (!t.sales_start_at || new Date(t.sales_start_at).getTime() <= nowMs) &&
      (!t.sales_end_at || new Date(t.sales_end_at).getTime() > nowMs),
    );
    const inStock = selling.filter((t) => t.status === "active" && t.quantity > t.sold_count);
    const prices = inStock.map((t) => t.price_kobo);
    const remaining = inStock.reduce((sum, t) => sum + Math.max(0, t.quantity - t.sold_count), 0);
    const hasExhaustedTier = selling.some((t) => t.quantity <= t.sold_count || t.status === "sold_out");
    const availability: EventCardDatum["availability"] =
      inStock.length === 0
        ? (selling.length > 0 && hasExhaustedTier ? "sold_out" : "closed")
        : remaining <= 10
          ? "few"
          : "available";
    return {
      ...rest,
      city_name: relationName(rest.city_name, "name"),
      venue_name: relationName(rest.venue_name, "name"),
      category_name: relationName(rest.category_name, "slug"),
      price_min_kobo: prices.length ? Math.min(...prices) : null,
      is_free: prices.length > 0 && prices.every((p) => p === 0),
      availability,
    };
  });
}

