import { getPublicSaleStatus } from "@/lib/public-sale-status";
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
    const sale = getPublicSaleStatus(ticket_types ?? [], nowMs);
    const prices = sale.inStock.map((t) => t.price_kobo);
    const availability: EventCardDatum["availability"] = sale.status;
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

