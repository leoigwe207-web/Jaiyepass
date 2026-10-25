import type { Metadata } from "next";
import { browseEvents, getCategories, getCities, type BrowseFilters } from "@/lib/queries";
import { EventCard } from "@/components/event-card";
import { ButtonLink, EmptyState } from "@/components/ui";
import { BrowseFilters as FiltersPanel } from "@/components/browse-filters";

export const metadata: Metadata = {
  title: "Browse events",
  description: "Search upcoming events by date, category, city, and price.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const date = str(sp.date);
  const price = str(sp.price);
  const sort = str(sp.sort);

  const filters: BrowseFilters = {
    q: str(sp.q),
    city: str(sp.city),
    category: str(sp.category),
    date: date === "today" || date === "weekend" || date === "week" || date === "month" ? date : undefined,
    price: price === "free" || price === "under10000" ? price : undefined,
    availability: sp.availability === "true" || undefined,
    sort: sort === "recent" ? "recent" : "soonest",
  };

  const [events, categories, cities] = await Promise.all([
    browseEvents(filters),
    getCategories(),
    getCities(),
  ]);

  const activeCount = [filters.q, filters.city, filters.category, filters.date, filters.price]
    .filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <p className="eyebrow">{filters.city ? "Events" : "All cities"}</p>
        <h1 className="display-lg mt-2">
          {filters.q ? `“${filters.q}”` : "Find your next night out"}
        </h1>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filters">
          <FiltersPanel categories={categories} cities={cities} activeCount={activeCount} />
        </aside>

        <section aria-label="Search results" aria-live="polite">
          <p className="mb-4 text-sm text-ink-soft">
            {events.length === 0
              ? "No events match"
              : `${events.length} event${events.length === 1 ? "" : "s"} found`}
          </p>

          {events.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.slug} event={e} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing matches those filters"
              description="Try a different date, a wider price range, or clear the filters to see everything coming up."
              action={<ButtonLink href="/events" variant="secondary">Clear filters</ButtonLink>}
            />
          )}
        </section>
      </div>
    </div>
  );
}
