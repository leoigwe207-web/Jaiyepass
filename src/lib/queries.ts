import "server-only";
import { createClient } from "./supabase/server";
import type { EventCardDatum } from "@/components/event-card";

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
  "id, slug, title, tagline, image_url, starts_at, is_demo, is_free, city_name:cities(name), ticket_types(price_kobo, quantity, sold_count, status, sales_end_at)";

/** Derive display price + availability from ticket types in one pass. */
function decorate(
  rows: (EventCardDatum & {
    ticket_types?: { price_kobo: number; quantity: number; sold_count: number; status: string; sales_end_at: string | null }[] | null;
  })[],
): EventCardDatum[] {
  return rows.map(({ ticket_types, ...rest }) => {
    const open = (ticket_types ?? []).filter((t) => t.status === "active");
    const prices = open.map((t) => t.price_kobo);
    const remaining = open.reduce((sum, t) => sum + (t.quantity - t.sold_count), 0);
    const availability: EventCardDatum["availability"] =
      open.length === 0
        ? "closed"
        : remaining === 0
          ? "sold_out"
          : remaining <= 10
            ? "few"
            : "available";
    return {
      ...rest,
      price_min_kobo: prices.length ? Math.min(...prices) : null,
      is_free: prices.length > 0 && prices.every((p) => p === 0),
      availability,
    };
  });
}

export async function getFeaturedEvents(limit = 4): Promise<EventCardDatum[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_CARD_SELECT)
    .eq("status", "published")
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
    .eq("status", "published");

  if (filters.q) {
    const term = filters.q.replace(/[%_,]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,tagline.ilike.%${term}%`);
  }
  if (filters.city) query = query.eq("city_id", (await idByName(supabase, "cities", filters.city)) ?? "00000000-0000-0000-0000-000000000000");
  if (filters.category)
    query = query.eq("category_id", (await idByName(supabase, "categories", filters.category)) ?? "00000000-0000-0000-0000-000000000000");

  const now = new Date();
  if (filters.date === "today") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    query = query.gte("starts_at", now.toISOString()).lte("starts_at", end.toISOString());
  } else if (filters.date === "weekend") {
    // Upcoming Saturday → Sunday midnight.
    const sat = new Date(now);
    sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    sun.setHours(23, 59, 59, 999);
    query = query.gte("starts_at", sat.toISOString()).lte("starts_at", sun.toISOString());
  } else if (filters.date === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    query = query.gte("starts_at", now.toISOString()).lte("starts_at", end.toISOString());
  } else if (filters.date === "month") {
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    query = query.gte("starts_at", now.toISOString()).lte("starts_at", end.toISOString());
  } else {
    query = query.gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString());
  }

  if (filters.price === "free") query = query.eq("is_free", true);
  if (filters.sort === "recent") query = query.order("created_at", { ascending: false });
  else query = query.order("starts_at", { ascending: true });

  const { data } = await query.limit(limit);
  let rows = decorate((data ?? []) as never[]) as (EventCardDatum & {
    category_name?: string | null;
    venue_name?: string | null;
  })[];

  if (filters.price === "under10000") {
    rows = rows.filter((r) => (r.price_min_kobo ?? 0) <= 1_000_000);
  }
  return rows;
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
  return decorate(rows);
}
