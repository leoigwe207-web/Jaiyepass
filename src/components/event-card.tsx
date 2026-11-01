import Link from "next/link";
import { formatDate, formatTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { Badge, EventImage } from "./ui";

export interface EventCardDatum {
  id: string;
  slug: string;
  title: string;
  tagline?: string | null;
  image_url?: string | null;
  starts_at: string;
  is_demo: boolean;
  is_free: boolean;
  price_min_kobo?: number | null;
  city_name?: string | null;
  venue_name?: string | null;
  availability?: "available" | "few" | "sold_out" | "closed";
}

function availabilityBadge(a?: EventCardDatum["availability"]) {
  if (a === "sold_out") return <Badge tone="danger">Sold out</Badge>;
  if (a === "few") return <Badge tone="warning">Few left</Badge>;
  if (a === "closed") return <Badge>Sales closed</Badge>;
  return null;
}

/** Standard card for grids — compact, scannable, price-first on mobile. */
export function EventCard({ event }: { event: EventCardDatum }) {
  const price =
    event.price_min_kobo === 0
      ? "Free"
      : event.price_min_kobo == null
        ? "See tickets"
        : `From ${formatKobo(event.price_min_kobo, { hideZeroDecimals: true })}`;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="jp-interactive-card group flex flex-col overflow-hidden rounded-card border border-line bg-white transition-shadow hover:shadow-[0_8px_30px_rgba(22,18,14,0.12)]"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-night">
        <EventImage
          src={event.image_url}
          alt={event.title}
          title={event.title}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex gap-2">
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="rounded-card bg-paper px-2 py-1 text-xs font-bold text-ink">
            {price}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neon-deep">
          {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
        </p>
        <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-bold leading-snug">
          {event.title}
        </h3>
        {event.tagline && (
          <p className="line-clamp-2 text-sm text-ink-soft">{event.tagline}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-ink-faint">
          <span className="truncate">
            {[event.venue_name, event.city_name].filter(Boolean).join(" · ")}
          </span>
          {availabilityBadge(event.availability)}
        </div>
      </div>
    </Link>
  );
}

/** Large feature treatment used for the hero event and collection leads. */
export function EventFeature({ event, size = "lg" }: { event: EventCardDatum; size?: "lg" | "md" }) {
  const aspect = size === "lg" ? "aspect-[16/10] md:aspect-[21/9]" : "aspect-[4/3]";
  return (
    <Link
      href={`/events/${event.slug}`}
      className={`jp-interactive-card group relative block overflow-hidden rounded-card border border-line bg-night ${aspect}`}
    >
      <EventImage
        src={event.image_url}
        alt={event.title}
        title={event.title}
        priority={size === "lg"}
        className="opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {availabilityBadge(event.availability)}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neon">
          {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
          {event.city_name ? ` · ${event.city_name}` : ""}
        </p>
        <h2
          className={`mt-1 font-[family-name:var(--font-fraunces)] font-extrabold leading-tight text-white ${
            size === "lg" ? "text-3xl md:text-5xl" : "text-2xl"
          }`}
        >
          {event.title}
        </h2>
        {event.tagline && (
          <p className="mt-1 max-w-xl text-sm text-white/85 line-clamp-2">{event.tagline}</p>
        )}
        <p className="mt-3 inline-block rounded-card bg-neon px-3 py-1.5 text-sm font-bold text-white">
          {event.price_min_kobo === 0
            ? "Free entry"
            : event.price_min_kobo == null
              ? "See tickets"
              : `From ${formatKobo(event.price_min_kobo, { hideZeroDecimals: true })}`}
        </p>
      </div>
    </Link>
  );
}

/** Horizontal row for lists (saved events, search results on mobile). */
export function EventRow({ event }: { event: EventCardDatum }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="jp-interactive-card group flex gap-4 rounded-card border border-line bg-white p-3 transition-shadow hover:shadow-[0_6px_20px_rgba(22,18,14,0.10)]"
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-card bg-night sm:h-28 sm:w-36">
        <EventImage src={event.image_url} alt={event.title} title={event.title} />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <p className="text-xs font-semibold text-neon-deep">
          {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
        </p>
        <h3 className="truncate font-[family-name:var(--font-fraunces)] text-base font-bold sm:text-lg">
          {event.title}
        </h3>
        <p className="truncate text-xs text-ink-faint">
          {[event.venue_name, event.city_name].filter(Boolean).join(" · ")}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">
            {event.price_min_kobo === 0
              ? "Free"
              : event.price_min_kobo == null
                ? "See tickets"
                : `From ${formatKobo(event.price_min_kobo, { hideZeroDecimals: true })}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
