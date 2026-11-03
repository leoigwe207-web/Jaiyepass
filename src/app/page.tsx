import Link from "next/link";
import { browseEvents, getCategories, getCities, supabaseConfigured } from "@/lib/queries";
import { COLLECTIONS } from "@/lib/collections";
import { EventCard, EventFeature, EventRow } from "@/components/event-card";
import { ButtonLink, EmptyState } from "@/components/ui";
import { HomeSearch } from "@/components/home-search";

export const revalidate = 300;

export default async function HomePage() {
  const [featured, upcoming, categories, cities] = await Promise.all([
    getFeaturedEventsSafe(),
    browseEvents({ sort: "soonest" }, 9),
    getCategories(),
    getCities(),
  ]);

  const hero = featured[0];
  const secondary = featured.slice(1, 3);
  const gridEvents = upcoming.filter((e) => e.slug !== hero?.slug).slice(0, 6);
  const under10k = upcoming.filter((e) => e.price_min_kobo != null && e.price_min_kobo <= 1_000_000 && e.slug !== hero?.slug).slice(0, 4);
  const freeEvents = upcoming.filter((e) => e.is_free && e.slug !== hero?.slug).slice(0, 4);

  return (
    <>
      {/* ── Hero: event-led, spacious, readable on a small laptop ─────────── */}
      <section className="relative overflow-hidden border-b border-line bg-paper">
        <div aria-hidden="true" className="pointer-events-none absolute right-5 top-2 hidden select-none text-[12rem] leading-none text-ink/[.035] lg:block">✳</div>
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 md:pb-20 md:pt-14">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow"><span aria-hidden="true" className="mr-2 text-neon-deep">✳</span> LIVE EXPERIENCES, ALL ACROSS NIGERIA</p>
              <h1 className="display-xl mt-4 max-w-[12ch]">
                Be there
                <br />
                <span className="italic text-neon-deep">for the</span> moment.
              </h1>
              <p className="mt-6 max-w-[41ch] text-base leading-relaxed text-ink-soft sm:text-lg">
                Big sounds. Small rooms. Brilliant people. Find real events across Nigeria,
                book your place and make the night yours.
              </p>
              <div className="mt-7">
                <HomeSearch cities={cities} />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold">
                <Link href="/events" className="inline-flex items-center justify-center rounded-card bg-neon-deep px-5 py-3 text-white transition-colors hover:bg-night">Explore events <span aria-hidden="true" className="ml-2">↗</span></Link>
                <Link href="/host-onboarding" className="inline-flex items-center justify-center rounded-card border border-ink px-5 py-3 text-ink transition-colors hover:bg-ink hover:text-paper">Host an event</Link>
              </div>
            </div>

            <div className="lg:pb-2">
              {hero ? (
                <EventFeature event={hero} />
              ) : (
                <div className="jp-home-empty relative flex min-h-[320px] flex-col justify-between overflow-hidden border border-white/10 bg-night p-7 text-paper sm:min-h-[400px] sm:p-9">
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[.2em] text-white/70">The lineup starts here</span>
                    <span aria-hidden="true" className="text-4xl text-neon">✳</span>
                  </div>
                  <div className="relative z-10">
                    <p className="font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.05] tracking-[-.04em]">
                      Good things<br />are coming.
                    </p>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
                      {supabaseConfigured()
                        ? "New experiences will appear here as hosts publish their events."
                        : "Discover a growing calendar of Nigerian experiences."}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link href="/events" className="inline-flex min-h-11 items-center bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep">Explore events</Link>
                      <Link href="/host-onboarding" className="inline-flex min-h-11 items-center border border-white/50 px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-ink">List an event</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {secondary.length > 0 && (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {secondary.map((e) => (
                <EventFeature key={e.slug} event={e} size="md" />
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-label="Explore event locations" className="border-b border-line bg-night text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-5 sm:px-6">
          <span className="mr-2 text-xs font-bold uppercase tracking-[.16em] text-white/60">Explore Nigeria</span>
          {[
            ["Lagos", "lagos"], ["Abuja", "abuja"], ["Port Harcourt", "port-harcourt"],
            ["Ibadan", "ibadan"], ["Enugu", "enugu"], ["Kano", "kano"],
          ].map(([name, slug]) => (
            <Link key={slug} href={`/events?city=${slug}`} className="rounded-card border border-white/25 px-3 py-2 text-sm font-semibold text-white transition-colors hover:border-neon hover:bg-neon-deep">{name} <span aria-hidden="true">↗</span></Link>
          ))}
          <Link href="/events" className="ml-auto text-sm font-semibold underline underline-offset-4 hover:text-neon">All locations</Link>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="border-b border-line bg-paper-deep" aria-labelledby="categories-heading">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="categories-heading" className="display-md">
                Browse by mood
              </h2>
              <Link href="/events" className="text-sm font-semibold underline decoration-2 underline-offset-4 hover:text-neon-deep">
                All events
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {categories.map((c, index) => (
                <li key={c.slug}>
                  <Link
                    href={`/events?category=${c.slug}`}
                    data-category={c.slug}
                    className="jp-category-card group flex min-h-[132px] flex-col justify-between border border-line bg-paper p-4 focus-visible:outline-offset-2 sm:min-h-[156px] sm:p-5"
                  >
                    <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.16em] text-ink-faint">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span aria-hidden="true" className="text-lg text-neon-deep transition-transform group-hover:translate-x-1">↗</span>
                    </span>
                    <span className="max-w-[12ch] font-[family-name:var(--font-fraunces)] text-[clamp(1.1rem,2vw,1.5rem)] font-bold leading-[1.12]">
                      {c.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Discovery shortcuts: searches, never fictional event claims ── */}
      <section aria-labelledby="collections-heading" className="border-b border-line bg-paper-deep">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Explore your way</p>
              <h2 id="collections-heading" className="display-lg mt-3 max-w-[15ch]">
                Find your next good story.
              </h2>
            </div>
            <p className="max-w-[39ch] text-base leading-relaxed text-ink-soft md:pb-1">
              Find real events across Nigeria by date, price or location.
              Your next experience starts with a simple search.
            </p>
          </div>

          <div className="mt-9 grid gap-3 md:grid-cols-3">
            {COLLECTIONS.map((c, index) => (
              <Link
                key={c.slug}
                href={collectionHref(c.filter)}
                className={`jp-discovery-tile group flex min-h-[228px] flex-col justify-between p-6 sm:p-7 ${index === 0 ? "jp-discovery-tile-featured" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[.17em] opacity-70">{c.eyebrow}</span>
                  <span aria-hidden="true" className="jp-discovery-arrow">↗</span>
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-fraunces)] text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight tracking-[-.02em]">{c.title}</h3>
                  <p className="mt-3 max-w-[28ch] text-sm leading-relaxed opacity-80">{c.blurb}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-7 flex flex-col justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold">Have a city in mind?</p>
              <p className="mt-1 text-xs text-ink-soft">Explore events in your preferred location.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {cities.slice(0, 5).map((city) => (
                <Link key={city.slug} href={`/events?city=${encodeURIComponent(city.slug)}`} className="jp-discovery-city">
                  {city.name}<span aria-hidden="true">↗</span>
                </Link>
              ))}
              <Link href="/events" className="jp-discovery-city jp-discovery-city-all">All events <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
          {upcoming.length === 0 && (
            <p className="mt-6 text-sm text-ink-soft" role="status">
              Events will appear as organizers publish their listings. These shortcuts search live listings; they are not sample events.
            </p>
          )}
        </div>
      </section>

      {/* ── Upcoming events grid ────────────────────────────────────────── */}
      <section className="border-t border-line bg-paper-deep" aria-labelledby="upcoming-heading">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow">Upcoming</p>
              <h2 id="upcoming-heading" className="display-lg mt-2">
                Coming up across Nigeria
              </h2>
            </div>
            <Link href="/events" className="text-sm font-semibold underline decoration-2 underline-offset-4 hover:text-neon-deep">
              See everything
            </Link>
          </div>

          {gridEvents.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gridEvents.map((e) => (
                <EventCard key={e.slug} event={e} />
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                title="Nothing on the calendar yet"
                description="When hosts publish events, they'll show up here first."
                action={<ButtonLink href="/host-onboarding" variant="secondary">List your event</ButtonLink>}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Editorial split: free + budget ───────────────────────────────── */}
      {(freeEvents.length > 0 && under10k.length > 0) && (
        <section className="border-t border-line" aria-labelledby="budget-heading">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Free this weekend</p>
              <h2 id="budget-heading" className="display-md mt-2">
                Zero naira, still a story
              </h2>
              <div className="mt-5 space-y-3">
                {freeEvents.slice(0, 3).map((e) => (
                  <EventRow key={e.slug} event={e} />
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">Under ₦10,000</p>
              <h2 className="display-md mt-2">Big nights, small budget</h2>
              <div className="mt-5 space-y-3">
                {under10k.slice(0, 3).map((e) => (
                  <EventRow key={e.slug} event={e} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Host CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-night text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neon">
              For organizers
            </p>
            <h2 className="display-md mt-3 text-white">
              Sell tickets. Run the gate.
              <br />
              Know your numbers.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
              Create an event in minutes, take secure Paystack payments, and
              check attendees in from your phone. Payouts reviewed and released
              by the platform, with a full ledger.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <ButtonLink href="/host-onboarding">Start selling tickets</ButtonLink>
            <ButtonLink href="/help" variant="ghost" className="text-white hover:text-neon">
              How payouts work
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

async function getFeaturedEventsSafe() {
  try {
    const { getFeaturedEvents } = await import("@/lib/queries");
    return await getFeaturedEvents(3);
  } catch {
    return [];
  }
}

function collectionHref(filter: {
  city?: string;
  category?: string;
  price?: "free" | "under10000";
  date?: "today" | "weekend" | "week";
}): string {
  const params = new URLSearchParams();
  if (filter.city) params.set("city", filter.city);
  if (filter.category) params.set("category", filter.category);
  if (filter.price) params.set("price", filter.price);
  if (filter.date) params.set("date", filter.date);
  return `/events?${params.toString()}`;
}

