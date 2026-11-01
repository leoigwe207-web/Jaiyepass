type Props = { name: string; address: string; city?: string | null };

/** Address-only map: never invent latitude/longitude or Google Place IDs. */
export function EventVenueMap({ name, address, city }: Props) {
  const destination = [name, address, city, "Nigeria"].filter(Boolean).join(", ");
  const encoded = encodeURIComponent(destination);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  const embedUrl = `https://maps.google.com/maps?q=${encoded}&z=15&output=embed`;
  return (
    <section className="mt-9" aria-labelledby="venue-location-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Find your way</p>
          <h2 id="venue-location-heading" className="display-md">Getting to the venue</h2>
          <p className="mt-2 text-sm text-ink-soft">{name} · {address}{city ? `, ${city}` : ""}</p>
        </div>
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="rounded-card bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-night focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon">
          Get directions ↗
        </a>
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-paper-dim">
        <iframe src={embedUrl} title={`Map showing search results for ${name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[280px] w-full sm:h-[340px]" />
      </div>
      <p className="mt-2 text-xs text-ink-faint">Map results are based on the organizer’s supplied address. Confirm the exact venue with the organizer before travelling. <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Open full Google Map</a>.</p>
    </section>
  );
}
