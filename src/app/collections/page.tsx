import type { Metadata } from "next";
import Link from "next/link";
import { COLLECTIONS } from "@/lib/collections";
import { browseEvents } from "@/lib/queries";
import { EventRow } from "@/components/event-card";
import { EmptyState, ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Collections" };
export const revalidate = 600;

export default async function CollectionsPage() {
  const all = await browseEvents({ sort: "soonest" }, 60);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Curated</p>
      <h1 className="display-lg mt-2">Collections</h1>
      <p className="mt-3 max-w-[60ch] text-ink-soft">
        Hand-picked shortcuts through the calendar. Each collection is a saved
        search, so it always reflects what's live right now.
      </p>

      <div className="mt-10 space-y-14">
        {COLLECTIONS.map((c) => {
          const matches = all
            .filter((e) => {
              if (c.filter.price === "free" && !e.is_free) return false;
              if (c.filter.price === "under10000" && (e.price_min_kobo ?? 0) > 1_000_000) return false;
              return true;
            })
            .slice(0, 4);

          return (
            <section key={c.slug} aria-labelledby={`col-${c.slug}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                <div>
                  <h2 id={`col-${c.slug}`} className="display-md">
                    {c.title}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">{c.blurb}</p>
                </div>
                <Link
                  href={`/events?${new URLSearchParams(
                    Object.entries(c.filter).filter(([, v]) => v) as [string, string][],
                  ).toString()}`}
                  className="text-sm font-semibold underline decoration-2 underline-offset-4 hover:text-neon-deep"
                >
                  See all
                </Link>
              </div>

              {matches.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {matches.map((e) => (
                    <EventRow key={e.slug} event={e} />
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="Nothing in this collection yet"
                    description="It fills up automatically as matching events get published."
                    action={<ButtonLink href="/events" variant="secondary">Browse everything</ButtonLink>}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
