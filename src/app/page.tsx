import Link from "next/link";
import { browseEvents, getCategories, getCities } from "@/lib/queries";
import { EventCard, type EventCardDatum } from "@/components/event-card";
import { HomeSearch } from "@/components/home-search";
import { EventImage } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { OrbitMark, Reveal, PressableMotion } from "@/components/motion/primitives";

export const revalidate = 300;

const cities = [
  { name: "Lagos", slug: "lagos", tag: "THE CITY THAT NEVER RESTS", code: "01" },
  { name: "Abuja", slug: "abuja", tag: "THE CAPITAL HAS PLANS", code: "02" },
  { name: "Port Harcourt", slug: "port-harcourt", tag: "GOOD ENERGY, ALWAYS", code: "03" },
];

function HomeEventRow({ event }: { event: EventCardDatum }) {
  const price = event.price_min_kobo === 0 || event.is_free
    ? "Free" : event.price_min_kobo == null ? "See tickets" : formatKobo(event.price_min_kobo, { hideZeroDecimals: true });
  return (
    <Link href={"/events/" + event.slug} className="jp-home-event-row group">
      <div className="min-w-0 flex-1 py-1">
        <p className="jp-event-kicker">UPCOMING EXPERIENCE</p>
        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug group-hover:text-neon-deep">{event.title}</h3>
        <p className="mt-2 line-clamp-1 text-xs text-ink-soft">{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</p>
        <p className="mt-1 line-clamp-1 text-xs text-ink-soft">{[event.venue_name, event.city_name].filter(Boolean).join(" · ") || "Nigeria"}</p>
        <p className="mt-3 text-sm font-extrabold text-neon-deep">{price} <span aria-hidden="true">↗</span></p>
      </div>
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-paper-deep sm:h-36 sm:w-44">
        <EventImage src={event.image_url} alt={event.title} title={event.title} category={event.category_name} />
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [events, categories, availableCities] = await Promise.all([
    browseEvents({ sort: "soonest" }, 18),
    getCategories(),
    getCities(),
  ]);
  const featured = events.slice(0, 3);
  const upcoming = events.slice(0, 10);
  return (
    <>
      <section data-jp-hero className="jp-v3-hero relative overflow-hidden" aria-labelledby="jp-home-heading">
        <div className="jp-v3-hero-grain" aria-hidden="true" />
        <div className="jp-v3-container jp-v3-hero-layout relative">
          <div className="jp-v3-hero-content">
            <div data-jp-hero-line className="jp-v3-hero-overline"><span className="jp-v3-live-dot" /> THE CULTURE IS CALLING <span className="jp-v3-hero-overline-end">NG / 2026</span></div>
            <h1 id="jp-home-heading" className="jp-v3-hero-title">
              <span data-jp-hero-line>Life looks better</span>
              <span data-jp-hero-line>when you <em>go out.</em></span>
            </h1>
            <p data-jp-hero-line className="jp-v3-hero-description">The concerts. The unforgettable nights. The things you&apos;ll talk about tomorrow. Find your people, find your plans, and be there.</p>
            <div data-jp-hero-line className="jp-v3-hero-actions">
              <Link href="/events" className="jp-v3-hero-cta">Explore events <span aria-hidden="true">↗</span></Link>
              <a href="#discover" className="jp-v3-hero-secondary">See what&apos;s happening <span aria-hidden="true">↓</span></a>
            </div>
            <div data-jp-hero-line className="jp-v3-hero-bottom"><span>BUILT FOR REAL-LIFE MOMENTS</span><span aria-hidden="true">✳</span><span>MADE IN NIGERIA</span></div>
          </div>
          <div className="jp-v3-hero-visual" aria-hidden="true">
            <div className="jp-v3-visual-back">IT&apos;S<br/>YOUR<br/>TIME.</div>
            <div className="jp-v3-orbit-container"><OrbitMark /></div>
            <div className="jp-v3-ticket-art">
              <div className="jp-v3-ticket-cut-top" />
              <div className="jp-v3-ticket-head"><span>JAIYEPASS PRESENTS</span><span>✳ 001</span></div>
              <div className="jp-v3-ticket-main">
                <span className="jp-v3-ticket-sun" />
                <p>THIS IS<br/><em>YOUR</em><br/>SIGN.</p>
              </div>
              <div className="jp-v3-ticket-foot"><span>GO OUT.<br/>LIVE MORE.</span><span className="jp-v3-ticket-barcode">▮▯▮▮▯▮▯▮▮</span></div>
              <div className="jp-v3-ticket-cut-bottom" />
            </div>
            <span className="jp-v3-visual-star">✳</span>
            <span className="jp-v3-visual-caption">A LITTLE MORE LIVING / A LOT MORE MEMORIES</span>
          </div>
        </div>
      </section>

      <div className="jp-v3-search-wrap relative z-10">
        <div className="jp-v3-container">
          <div className="jp-v3-search-panel">
            <div className="jp-v3-search-heading"><span className="jp-v3-search-badge">01 / FIND YOUR VIBE</span><p>Your next story starts here.</p></div>
            <HomeSearch cities={availableCities} />
          </div>
        </div>
      </div>

      <section id="discover" className="jp-v3-section jp-v3-container" aria-labelledby="featured-title">
        <Reveal className="jp-v3-section-top">
          <div><span className="jp-v3-section-kicker">THE GOOD STUFF / 001</span><h2 id="featured-title" className="jp-v3-section-title">Make a night <em>of it.</em></h2><p className="jp-v3-section-copy">A little something for every kind of outside person.</p></div>
          <Link href="/events" className="jp-v3-text-link">All events <span aria-hidden="true">↗</span></Link>
        </Reveal>

        {featured.length ? (
          <div className="jp-v3-feature-grid">
            {featured.map((event, index) => <Reveal key={event.slug} delay={index * 0.09}><EventCard event={event} /></Reveal>)}
          </div>
        ) : (
          <Reveal>
            <div className="jp-v3-editorial-empty">
              <div className="jp-v3-editorial-copy">
                <span className="jp-v3-section-kicker">THE LINEUP IS COMING TOGETHER</span>
                <h3>Good things<br/>are <em>on the way.</em></h3>
                <p>Our next wave of experiences is on its way. Explore by city and be first to see what&apos;s coming.</p>
                <Link href="/events" className="jp-v3-white-cta">Browse all events <span aria-hidden="true">↗</span></Link>
              </div>
              <div className="jp-v3-empty-art" aria-hidden="true"><span>THE<br/>NEXT<br/>THING</span><div className="jp-v3-empty-disc"><span>✳</span></div><small>WILL BE WORTH THE WAIT.</small></div>
            </div>
          </Reveal>
        )}
      </section>

      <section className="jp-v3-city-section" aria-labelledby="city-heading">
        <div className="jp-v3-container">
          <Reveal className="jp-v3-section-top">
            <div><span className="jp-v3-section-kicker">FIND YOUR SCENE / 002</span><h2 id="city-heading" className="jp-v3-section-title">Every city has <em>a story.</em></h2><p className="jp-v3-section-copy">Choose your city. We&apos;ll handle the good plans.</p></div>
          </Reveal>
          <div className="jp-v3-city-grid">
            {cities.map((city, index) => (
              <Reveal key={city.slug} delay={index * 0.08}>
                <PressableMotion>
                  <Link href={"/events?city=" + city.slug} className={"jp-v3-city-card jp-v3-city-card-" + index}>
                    <span className="jp-v3-city-number">{city.code} / NIGERIA</span>
                    <span className="jp-v3-city-name">{city.name}</span>
                    <span className="jp-v3-city-bottom"><small>{city.tag}</small><span aria-hidden="true">↗</span></span>
                  </Link>
                </PressableMotion>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="jp-v3-section jp-v3-container" aria-labelledby="upcoming-title">
        <Reveal className="jp-v3-section-top">
          <div><span className="jp-v3-section-kicker">COMING UP / 003</span><h2 id="upcoming-title" className="jp-v3-section-title">On the <em>calendar.</em></h2><p className="jp-v3-section-copy">Find your next occasion, whatever your mood.</p></div>
          <Link href="/events" className="jp-v3-text-link">View calendar <span aria-hidden="true">↗</span></Link>
        </Reveal>
        <div className="jp-v3-filter-strip" role="navigation" aria-label="Quick event filters">
          <Link className="jp-v3-filter-pill is-active" href="/events">All events</Link>
          <Link className="jp-v3-filter-pill" href="/events?price=free">Free</Link>
          <Link className="jp-v3-filter-pill" href="/events?date=weekend">This weekend</Link>
          <Link className="jp-v3-filter-pill" href="/events?price=under10000">Under ₦10,000</Link>
        </div>
        {upcoming.length ? (
          <div className="jp-v3-upcoming-grid">{upcoming.map(event => <HomeEventRow key={event.slug} event={event}/>)}</div>
        ) : (
          <Reveal><div className="jp-v3-no-events"><span aria-hidden="true">✳</span><div><h3>Nothing on the calendar just yet.</h3><p>New events will show up here when organizers publish them. Until then, explore by category or city.</p></div><Link href="/events" className="jp-v3-text-link">Explore events ↗</Link></div></Reveal>
        )}
        <div className="mt-9 text-center"><Link href="/events" className="jp-v3-dark-cta">See all events <span aria-hidden="true">↗</span></Link></div>
      </section>

      {categories.length > 0 && (
        <section className="jp-v3-categories" aria-labelledby="categories-title">
          <div className="jp-v3-container">
            <Reveal><span className="jp-v3-section-kicker">GO BY FEELING / 004</span><h2 id="categories-title" className="jp-v3-section-title">What are you <em>in the mood for?</em></h2></Reveal>
            <div className="jp-v3-categories-grid">{categories.slice(0, 10).map((category, i) => <Link key={category.slug} href={"/events?category=" + encodeURIComponent(category.slug)} className="jp-v3-category-pill"><span className="jp-v3-category-counter">{String(i+1).padStart(2,"0")}</span>{category.name}<span aria-hidden="true">↗</span></Link>)}</div>
          </div>
        </section>
      )}

      <section id="how-it-works" className="jp-v3-how" aria-labelledby="how-heading">
        <div className="jp-v3-container jp-v3-how-layout">
          <Reveal><span className="jp-v3-section-kicker">THE EASY PART / 005</span><h2 id="how-heading">Three steps.<br/><em>One great time.</em></h2><p>From discovering your next plan to getting through the door, we make it beautifully simple.</p><Link href="/events" className="jp-v3-white-cta">Find something to do ↗</Link></Reveal>
          <div className="jp-v3-how-steps">
            {[
              { n: "01", title: "Find your vibe", copy: "Browse events that match your city, your energy, and your budget." },
              { n: "02", title: "Get your pass", copy: "Secure your spot with a few easy steps and keep your ticket handy." },
              { n: "03", title: "Make memories", copy: "Show your QR ticket at the door. Enjoy the moment; you've earned it." },
            ].map((item, i) => <Reveal key={item.n} delay={i*0.07}><div className="jp-v3-how-step"><span>{item.n}</span><div><h3>{item.title}</h3><p>{item.copy}</p></div><span aria-hidden="true">↗</span></div></Reveal>)}
          </div>
        </div>
      </section>
    </>
  );
}
