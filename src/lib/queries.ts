import "server-only";
import { createClient } from "./supabase/server";
import type { EventCardDatum } from "@/components/event-card";
import { decorateEventCards } from "./event-card-logic";
import { eventDateRange } from "./date-filters";

/**
 * Public read layer. Every query degrades to an empty result when Supabase is
 * not configured, so the production build and static pages still succeed in
 * local/dev environments without credentials.
 */

export function supabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const EVENT_CARD_SELECT =
  "id, slug, title, tagline, image_url, starts_at, is_demo, is_free, city_name:cities(name), ticket_types(price_kobo, quantity, sold_count, status, sales_start_at, sales_end_at)";

/** Derive display price + availability from ticket types in one pass. */
const decorate = decorateEventCards;

export async function getFeaturedEvents(limit = 4): Promise<EventCardDatum[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .eq("status", "published")
    .eq("is_demo", false)
    .order("featured", { ascending: false })
    .order("starts_at", { ascending: true })
    .limit(limit);
  return decorate((data ?? []) as never[]);
}

export interface BrowseFilters {
  q?: string;
  city?: string;
  category?: string;
  date?: "today" | "weekend" | "week" | "month";
  price?: "free" | "under10000";
  availability?: boolean;
  sort?: "soonest" | "recent";
}

export async function browseEvents(
  filters: BrowseFilters,
  limit = 48,
): Promise<EventCardDatum[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select(`${EVENT_CARD_SELECT}, venue_name:venues(name), category_name:categories(slug)`)
    .eq("status", "published")
    .eq("is_demo", false);

  if (filters.q) {
    // Supabase's PostgREST OR expression must be sanitized before interpolation.
    const term = filters.q.replace(/[%_,.()\\]/g, " ").trim().slice(0, 80);
    if (term) {
      const { data: venues } = await supabase
        .from("venues")
        .select("id")
        .ilike("name", `%${term}%`)
        .limit(30);
      const venueIds = (venues ?? []).map((v) => v.id).filter(Boolean);
      const venueExpression = venueIds.length ? `,venue_id.in.(${venueIds.join(",")})` : "";
      query = query.or(`title.ilike.%${term}%,tagline.ilike.%${term}%,description.ilike.%${term}%${venueExpression}`);
    }
  }
  if (filters.city) query = query.eq("city_id", (await idByName(supabase, "cities", filters.city)) ?? "00000000-0000-0000-0000-000000000000");
  if (filters.category)
    query = query.eq("category_id", (await idByName(supabase, "categories", filters.category)) ?? "00000000-0000-0000-0000-000000000000");

  if (filters.date) {
    const range = eventDateRange(filters.date);
    query = query.gte("starts_at", range.start).lt("starts_at", range.end);
  } else {
    query = query.gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString());
  }

  // Price and availability are checked against open ticket tiers after the read;
  // events.is_free can be stale if organizers edit prices.
  if (filters.sort === "recent") query = query.order("created_at", { ascending: false });
  else query = query.order("starts_at", { ascending: true });

  const { data } = await query.limit(
    filters.price || filters.availability ? Math.min(300, Math.max(limit * 4, 96)) : limit,
  );
  let rows = decorate((data ?? []) as never[]) as (EventCardDatum & {
    category_name?: string | null;
    venue_name?: string | null;
  })[];

  if (filters.price === "free") {
    rows = rows.filter((r) => r.price_min_kobo === 0);
  }
  if (filters.price === "under10000") {
    rows = rows.filter((r) => r.price_min_kobo != null && r.price_min_kobo <= 1_000_000);
  }
  if (filters.availability) {
    rows = rows.filter((r) => r.availability === "available" || r.availability === "few");
  }
  return rows.slice(0, limit);
}

async function idByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "cities" | "categories",
  slug: string,
): Promise<string | null> {
  const { data } = await supabase.from(table).select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

export async function getCities(): Promise<{ name: string; slug: string }[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("cities")
    .select("name, slug")
    .eq("is_active", true)
    .eq("country", "Nigeria")
    .order("sort_order");
  return data ?? [];
}

export async function getCategories(): Promise<{ name: string; slug: string }[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("name, slug")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

/** Saved events for one attendee (row-scoped by RLS to the caller). */
export async function getSavedEvents(userId: string): Promise<EventCardDatum[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_events")
    .select(
      `event:events(${EVENT_CARD_SELECT}, venue_name:venues(name), category_name:categories(slug))`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const rows = ((data ?? []) as unknown as { event: null }[])
    .map((r) => r.event)
    .filter(Boolean) as never[];
  return decorate(rows).filter((e) => !e.is_demo);
}
