import type { Metadata } from "next";
import { browseEvents, getCategories, getCities, type BrowseFilters } from "@/lib/queries";
import { EventCard } from "@/components/event-card";
import { ButtonLink, EmptyState } from "@/components/ui";
import { BrowseFilters as FiltersPanel } from "@/components/browse-filters";
import { Reveal } from "@/components/motion/primitives";

export const metadata: Metadata = { title: "Explore events", description: "Explore and filter upcoming events in Nigeria by city, date, category and price." };
export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function str(v: string | string[] | undefined): string | undefined { return typeof v === "string" && v.length > 0 ? v : undefined; }

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const date = str(sp.date), price = str(sp.price), sort = str(sp.sort);
  const filters: BrowseFilters = {
    q: str(sp.q), city: str(sp.city), category: str(sp.category),
    date: date === "today" || date === "weekend" || date === "week" || date === "month" ? date : undefined,
    price: price === "free" || price === "under10000" ? price : undefined,
    availability: sp.availability === "true" || undefined,
    sort: sort === "recent" ? "recent" : "soonest",
  };
  const [events, categories, cities] = await Promise.all([browseEvents(filters),getCategories(),getCities()]);
  const activeCount = [filters.q,filters.city,filters.category,filters.date,filters.price].filter(Boolean).length + (filters.availability ? 1 : 0);
  return (
    <div className="jp-v3-catalog">
      <header className="jp-v3-catalog-hero">
        <div className="jp-v3-container">
          <Reveal>
            <span className="jp-v3-section-kicker">THE JAIYEPASS EVENT GUIDE / NIGERIA</span>
            <h1>{filters.q ? <>Results for <em>“{filters.q}”</em></> : <>Your next <em>move.</em></>}</h1>
            <p>Big nights. Little discoveries. Plans you won't want to miss.</p>
          </Reveal>
          <span className="jp-v3-catalog-asterisk" aria-hidden="true">✳</span>
        </div>
      </header>
      <div className="jp-v3-container jp-v3-catalog-body">
        <aside aria-label="Filters" className="jp-v3-catalog-sidebar">
          <div className="jp-v3-sidebar-heading"><span>REFINE YOUR PLANS</span><span>{activeCount ? activeCount + " ACTIVE" : "ALL EVENTS"}</span></div>
          <FiltersPanel categories={categories} cities={cities} activeCount={activeCount} />
        </aside>
        <section aria-label="Search results" aria-live="polite" className="jp-v3-catalog-results">
          <div className="jp-v3-results-head"><div><span className="jp-v3-section-kicker">THE LINEUP</span><h2>{events.length ? "What's happening" : "A little quiet right now"}</h2></div><p>{events.length} {events.length === 1 ? "event" : "events"} found</p></div>
          {events.length > 0 ? (
            <div className="jp-v3-catalog-grid">{events.map((event,i) => <Reveal key={event.slug} delay={(i % 3) * 0.07}><EventCard event={event} /></Reveal>)}</div>
          ) : (
            <div className="jp-v3-catalog-empty">
              <span className="jp-v3-catalog-empty-mark" aria-hidden="true">✳</span>
              <EmptyState title="Nothing for those filters (yet)." description="Try another city, weekend or ticket price. New experiences will appear here as they're published." action={<ButtonLink href="/events" variant="secondary">Clear filters ↗</ButtonLink>} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
