import Link from "next/link";
import { browseEvents, getCategories, getCities, supabaseConfigured } from "@/lib/queries";
import { COLLECTIONS } from "@/lib/collections";
import { EventCard, EventFeature, EventRow } from "@/components/event-card";
import { ButtonLink, DemoBadge, EmptyState } from "@/components/ui";
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
  const under10k = upcoming.filter((e) => (e.price_min_kobo ?? 0) <= 1_000_000 && e.slug !== hero?.slug).slice(0, 4);
  const freeEvents = upcoming.filter((e) => e.is_free && e.slug !== hero?.slug).slice(0, 4);

  return (
    <>
      {/* ── Hero: event-led, spacious, readable on a small laptop ─────────── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 md:pb-20 md:pt-14">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow">Lagos · Nigeria</p>
              <h1 className="display-xl mt-3">
                Your pass to
                <br />
                a good time.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
                Find the night worth leaving the house for — then bring the
                crew along with one shared plan link.
              </p>
              <div className="mt-7">
                <HomeSearch cities={cities} />
              </div>
            </div>

            <div className="lg:pb-2">
              {hero ? (
                <EventFeature event={hero} />
              ) : (
                <EmptyState
                  title="No published events yet"
                  description={
                    supabaseConfigured()
                      ? "Events will appear here as soon as hosts publish them."
                      : "Connect Supabase and run the migrations to load demo events."
                  }
                  action={<ButtonLink href="/host-onboarding">Host the first event</ButtonLink>}
                />
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
            <ul className="mt-5 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/events?category=${c.slug}`}
                    className="inline-block rounded-card border border-line bg-paper px-4 py-2 text-sm font-medium hover:border-ink hover:bg-ink hover:text-paper"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Curated collections: varied treatments, not a wall of cards ──── */}
      <section aria-labelledby="collections-heading">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="eyebrow">Curated</p>
          <h2 id="collections-heading" className="display-lg mt-2">
            Made for the way you go out
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COLLECTIONS.slice(0, 3).map((c) => (
              <CollectionTile key={c.slug} href={collectionHref(c.filter)} title={c.title} blurb={c.blurb} accent={c.slug === "tonight-in-lagos"} />
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {COLLECTIONS.slice(3).map((c) => (
              <CollectionTile key={c.slug} href={collectionHref(c.filter)} title={c.title} blurb={c.blurb} wide />
            ))}
          </div>
        </div>
      </section>

      {/* ── Upcoming events grid ────────────────────────────────────────── */}
      <section className="border-t border-line bg-paper-deep" aria-labelledby="upcoming-heading">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow">Upcoming</p>
              <h2 id="upcoming-heading" className="display-lg mt-2">
                Coming up in Lagos
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
      {(freeEvents.length > 0 || under10k.length > 0) && (
        <section className="border-t border-line" aria-labelledby="budget-heading">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Free this weekend</p>
              <h2 id="budget-heading" className="display-md mt-2">
                Zero naira, still a story
              </h2>
              <div className="mt-5 space-y-3">
                {(freeEvents.length ? freeEvents : under10k).slice(0, 3).map((e) => (
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

function CollectionTile({
  href,
  title,
  blurb,
  wide = false,
  accent = false,
}: {
  href: string;
  title: string;
  blurb: string;
  wide?: boolean;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between rounded-card border p-6 transition-colors ${
        accent
          ? "border-neon bg-neon text-white hover:bg-neon-deep"
          : "border-line bg-paper hover:border-ink hover:bg-ink hover:text-paper"
      } ${wide ? "sm:col-span-1" : ""} min-h-[150px]`}
    >
      <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">{title}</h3>
      <p className={`mt-2 text-sm ${accent ? "text-white/85" : "opacity-80"}`}>{blurb}</p>
    </Link>
  );
}
