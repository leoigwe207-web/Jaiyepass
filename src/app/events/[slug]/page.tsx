import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/queries";
import { formatDateRange } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { ButtonLink, EventImage } from "@/components/ui";
import { SaveEventButton } from "@/components/save-event-button";
import { SharePlanButton } from "@/components/share-plan-button";
import { TicketPicker } from "@/components/ticket-picker";
import { getSessionUser } from "@/lib/auth";
import { guestCheckoutEnabled as guestEnabled } from "@/lib/env";
import { EventViewed } from "@/components/analytics/analytics";
import type { TicketTypeOption } from "@/components/ticket-picker-types";
import { ReportEventForm } from "@/components/report-event-form";
import { EventVenueMap } from "@/components/event-venue-map";
import { sanitizeText } from "@/lib/validation-server";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function getEvent(slug: string) {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(
      `id, slug, title, tagline, description, image_url, starts_at, ends_at, doors_open_at,
       age_guidance, refund_policy, status, is_demo, is_free, published_at,
       city_name:cities(name), category_name:categories(name),
       venue:venues(name, address, map_url),
       organization:organizations(id, name, slug, description, verification),
       ticket_types(id, name, description, price_kobo, quantity, sold_count, per_order_limit,
                   sales_start_at, sales_end_at, status, sort_order)`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .eq("is_demo", false)
    .maybeSingle();
  if (!data || (data.organization as { verification?: string } | null)?.verification !== "verified") return null;
  return data as unknown as EventDetailRow;
}

interface EventDetailRow {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  doors_open_at: string | null;
  age_guidance: string | null;
  refund_policy: string;
  is_demo: boolean;
  is_free: boolean;
  city_name: { name: string } | null;
  category_name: string | null;
  venue: { name: string; address: string; map_url: string | null } | null;
  organization: { id: string; name: string; slug: string; description: string | null; verification: string } | null;
  ticket_types: {
    id: string;
    name: string;
    description: string | null;
    price_kobo: number;
    quantity: number;
    sold_count: number;
    per_order_limit: number;
    sales_start_at: string | null;
    sales_end_at: string | null;
    status: string;
    sort_order: number;
  }[];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.tagline ?? `Tickets for ${event.title} on JaiyePass.`,
    // NOTE: never include attendee or order data in public metadata.
  };
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) notFound();

  const currentUser = await getSessionUser();
  const guestCheckoutEnabled = guestEnabled();
  const now = Date.now();
  const openTickets: TicketTypeOption[] = (event.ticket_types ?? [])
    .filter((t) => {
      if (t.status !== "active") return false;
      if (t.sales_start_at && new Date(t.sales_start_at).getTime() > now) return false;
      if (t.sales_end_at && new Date(t.sales_end_at).getTime() <= now) return false;
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      priceKobo: t.price_kobo,
      remaining: Math.max(0, t.quantity - t.sold_count),
      perOrderLimit: t.per_order_limit,
    }));

  const soldOut = openTickets.every((t) => t.remaining === 0);
  const minPrice = openTickets.length ? Math.min(...openTickets.map((t) => t.priceKobo)) : null;
  const mapQuery = event.venue
    ? encodeURIComponent(`${event.venue.name}, ${event.venue.address}`)
    : null;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      {!soldOut && openTickets.length > 0 && (
        <EventViewed
          eventId={event.id}
          isFree={event.is_free}
          ticketTiers={openTickets.length}
          soldOut={soldOut}
        />
      )}

      {/* ── Media band ─────────────────────────────────────────────────── */}
      <div className="relative aspect-[16/9] max-h-[440px] overflow-hidden rounded-card border border-line bg-night md:aspect-[21/9]">
        <EventImage
          src={event.image_url}
          alt={event.title}
          title={event.title}
          priority
        />

      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* ── Left: details ───────────────────────────────────────────── */}
        <div>
          <p className="text-sm font-semibold text-neon-deep">
            {formatDateRange(event.starts_at, event.ends_at)}
          </p>
          <h1 className="display-lg mt-2">{event.title}</h1>
          {event.tagline && <p className="mt-3 text-lg text-ink-soft">{event.tagline}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <SaveEventButton eventSlug={event.slug} />
            <SharePlanButton eventId={event.id} eventSlug={event.slug} eventTitle={event.title} />
          </div>

          <dl className="mt-8 grid gap-4 border-y border-line py-6 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">When</dt>
              <dd className="mt-1 text-sm font-medium">
                {formatDateRange(event.starts_at, event.ends_at)}
                {event.doors_open_at && (
                  <span className="block text-ink-faint">
                    Doors open {new Date(event.doors_open_at).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Where</dt>
              {event.venue ? (
                <dd className="mt-1 text-sm font-medium">
                  {event.venue.name}
                  <span className="block text-ink-faint">{event.venue.address}</span>
                  {event.venue.map_url && (
                    <a
                      href={event.venue.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-neon-deep underline underline-offset-2"
                    >
                      Open in maps
                    </a>
                  )}
                </dd>
              ) : (
                <dd className="mt-1 text-sm">Venue to be announced</dd>
              )}
            </div>
            {event.age_guidance && (
              <div>
                <dt className="eyebrow">Age guidance</dt>
                <dd className="mt-1 text-sm font-medium">{event.age_guidance}</dd>
              </div>
            )}
            <div>
              <dt className="eyebrow">Hosted by</dt>
              <dd className="mt-1 text-sm font-medium">
                {event.organization?.name ?? "JaiyePass"}
              </dd>
            </div>
          </dl>

          <section className="mt-8" aria-labelledby="about-event">
            <h2 id="about-event" className="display-md">
              About this event
            </h2>
            <div className="prose-custom mt-3 max-w-[68ch] whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
              {sanitizeText(event.description) || "The host hasn't added a description yet."}
            </div>
          </section>

          {event.venue?.name && event.venue?.address && (
            <EventVenueMap name={event.venue.name} address={event.venue.address} city={event.city_name?.name} />
          )}

          <section className="mt-8" aria-labelledby="refund-policy">
            <h2 id="refund-policy" className="display-md">
              Refund policy
            </h2>
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-ink-soft">
              {sanitizeText(event.refund_policy)}
            </p>
          </section>

          <section className="mt-8 border-t border-line pt-6" aria-labelledby="report-event">
            <h2 id="report-event" className="text-sm font-bold">
              Something wrong with this listing?
            </h2>
            <ReportEventForm eventId={event.id} />
          </section>
        </div>

        {/* ── Right: sticky ticket panel ──────────────────────────────── */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-line bg-white p-5 shadow-[0_10px_40px_rgba(22,18,14,0.08)]">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold">Tickets</h2>
              {minPrice !== null && (
                <p className="text-sm font-semibold">
                  {minPrice === 0 ? "Free" : `From ${formatKobo(minPrice, { hideZeroDecimals: true })}`}
                </p>
              )}
            </div>

            {soldOut || openTickets.length === 0 ? (
              <div className="mt-4">
                <p className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
                  {soldOut ? "Sold out" : "Sales are closed for this event"}
                </p>
                <p className="mt-3 text-sm text-ink-soft">
                  Check back later or save the event to get notified when more tickets drop.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <TicketPicker
                  eventId={event.id}
                  eventTitle={event.title}
                  tickets={openTickets}
                  signedIn={Boolean(currentUser)}
                  guestCheckoutEnabled={guestCheckoutEnabled}
                />
              </div>
            )}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Payments are processed securely by Paystack. Your ticket QR code is
            issued after payment is confirmed and never contains your personal
            details.
          </p>
        </aside>
      </div>
    </article>
  );
}
