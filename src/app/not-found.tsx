import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display-xl mt-3">This page sat out.</h1>
      <p className="mt-4 text-ink-soft">
        The link may be old, or the event may have ended and been archived.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/events"
          className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep"
        >
          Browse events
        </Link>
        <Link
          href="/"
          className="rounded-card border border-ink px-5 py-3 text-sm font-semibold hover:bg-ink hover:text-paper"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
