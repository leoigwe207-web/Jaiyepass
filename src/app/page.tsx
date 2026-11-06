import Link from "next/link";
import { browseEvents, getCategories, getCities } from "@/lib/queries";
import { EventCard, type EventCardDatum } from "@/components/event-card";
import { HomeSearch } from "@/components/home-search";
import { EventImage } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";

export const revalidate = 300;

function HomeEventRow({ event }: { event: EventCardDatum }) {
  const price = event.price_min_kobo === 0 || event.is_free
    ? "Free" : event.price_min_kobo == null ? "See tickets" : formatKobo(event.price_min_kobo, { hideZeroDecimals: true });
  return (
    <Link href={"/events/" + event.slug} className="jp-home-event-row group">
      <div className="min-w-0 flex-1 py-1">
        <h3 className="line-clamp-2 text-base font-bold leading-snug group-hover:text-neon-deep">{event.title}</h3>
        <p className="mt-2 line-clamp-1 text-xs text-ink-soft">{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</p>
        <p className="mt-1 line-clamp-1 text-xs text-ink-soft">{[event.venue_name, event.city_name].filter(Boolean).join(" · ") || "Nigeria"}</p>
        <p className="mt-3 text-sm font-extrabold text-neon-deep">{price}</p>
      </div>
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-paper-deep sm:h-36 sm:w-44">
        <EventImage src={event.image_url} alt={event.title} title={event.title} category={event.category_name} />
      </div>
    </Link>
  );
}

const quickCities = [
  { name: "Lagos", slug: "lagos" }, { name: "Abuja", slug: "abuja" }, { name: "Port Harcourt", slug: "port-harcourt" },
];

export default async function HomePage() {
  const [events, categories, cities] = await Promise.all([
    browseEvents({ sort: "soonest" }, 18),
    getCategories(),
    getCities(),
  ]);
  const featured = events.slice(0, 3);
  const popular = events.slice(0, 12);

  return (
    <>
      <section className="jp-discover-intro">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-11 sm:px-6 sm:pb-14 sm:pt-16">
          <p className="jp-mini-eyebrow">YOUR PASS TO A GOOD TIME</p>
          <h1 className="jp-home-title mt-3">Discover events.<br/><span>Make memories.</span></h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft">Find concerts, festivals, comedy nights and experiences worth showing up for.</p>
          <div className="mt-7 max-w-3xl"><HomeSearch cities={cities}/></div>
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <span className="mr-1 text-xs font-semibold text-ink-soft">Find events in:</span>
            {quickCities.map(city => <Link key={city.slug} href={"/events?city=" + city.slug} className="jp-city-chip">{city.name}</Link>)}
            <Link href="/events" className="jp-city-chip">All Nigeria</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 pt-11 sm:px-6 sm:pt-14" aria-labelledby="featured-title">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="jp-mini-eyebrow">WHAT'S ON</p><h2 id="featured-title" className="jp-section-title mt-2">Find your next great night</h2></div>
          <Link href="/events" className="shrink-0 text-sm font-bold text-neon-deep">See all</Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map(event => <EventCard key={event.slug} event={event}/>)}
          </div>
        ) : (
          <div className="jp-home-placeholder">
            <div><p className="text-xs font-bold uppercase tracking-widest text-white/75">A good time is coming</p><h3 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Your next story<br/>starts here.</h3><p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">Published events will appear here as organizers list them. Explore by city or category in the meantime.</p>
              <Link href="/events" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-ink">Browse events</Link>
            </div>
            <span className="jp-home-placeholder-star" aria-hidden="true">✳</span>
          </div>
        )}
      </section>

      <section className="border-y border-line bg-white" aria-labelledby="popular-events-title">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
          <p className="jp-mini-eyebrow">EXPLORE</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 id="popular-events-title" className="jp-section-title">Upcoming events</h2>
            <Link href="/events" className="shrink-0 text-sm font-bold text-neon-deep">See all</Link>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            <Link className="jp-filter-chip active" href="/events">All events</Link>
            <Link className="jp-filter-chip" href="/events?price=free">Free</Link>
            <Link className="jp-filter-chip" href="/events?price=under10000">Under ₦10,000</Link>
            <Link className="jp-filter-chip" href="/events?date=weekend">This weekend</Link>
          </div>
          {popular.length ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-2 lg:gap-x-6">
              {popular.map(event => <HomeEventRow key={event.slug} event={event}/>)}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-line bg-paper p-7 text-center sm:p-12">
              <p className="text-lg font-bold">No upcoming events have been published yet.</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">New events will appear here as organizers publish them. Check back soon or browse available filters.</p>
            </div>
          )}
          <div className="mt-9 text-center">
            <Link href="/events" className="jp-button-primary inline-flex min-w-52 justify-center">See all events</Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6" aria-labelledby="categories-title">
          <p className="jp-mini-eyebrow">BROWSE YOUR WAY</p>
          <h2 id="categories-title" className="jp-section-title mt-2">What are you in the mood for?</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map(category => <Link href={"/events?category=" + encodeURIComponent(category.slug)} key={category.slug} className="jp-city-chip px-5 py-3">{category.name}</Link>)}
          </div>
        </section>
      )}

      <section id="how-it-works" className="border-t border-line bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <p className="jp-mini-eyebrow">SIMPLE FROM START TO FINISH</p>
          <h2 className="jp-section-title mt-2">How JaiyePass works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { step: "01", title: "Find your event", detail: "Explore experiences by city, date and price." },
              { step: "02", title: "Get your tickets", detail: "Book securely online, with guest checkout where available." },
              { step: "03", title: "Show up & enjoy", detail: "Keep your QR ticket ready for entry." },
            ].map(item => <div key={item.step} className="rounded-2xl border border-line bg-white p-6"><span className="text-2xl font-extrabold text-neon-deep">{item.step}</span><h3 className="mt-4 text-lg font-bold">{item.title}</h3><p className="mt-2 text-sm text-ink-soft">{item.detail}</p></div>)}
          </div>
        </div>
      </section>
    </>
  );
}
