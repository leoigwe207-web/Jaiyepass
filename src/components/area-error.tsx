"use client";

import Link from "next/link";

/**
 * Error boundary for the account, host and admin areas. Distinguishes the
 * expected "database not connected" case (unconfigured environments) from
 * unexpected failures, without leaking stack traces.
 */
export function AreaError({
  error,
  reset,
  areaHome,
  areaLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  areaHome: string;
  areaLabel: string;
}) {
  const notConfigured = /not configured|missing server env|supabase/i.test(error.message ?? "");

  return (
    <section className="mx-auto max-w-2xl rounded-card border border-line bg-white p-6 text-center sm:p-8">
      <p className="eyebrow">{areaLabel}</p>
      {notConfigured ? (
        <>
          <h1 className="display-md mt-2">This section is temporarily unavailable</h1>
          <p className="mt-3 text-sm text-ink-soft">
            We couldn't load this area right now. Please try again later or contact support.
          </p>
        </>
      ) : (
        <>
          <h1 className="display-md mt-2">Something went wrong</h1>
          <p className="mt-3 text-sm text-ink-soft">
            We couldn&apos;t load this section. Try again, and if it keeps
            happening contact support.
          </p>
        </>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={areaHome}
          className="rounded-card bg-ink px-5 py-3 text-sm font-bold text-paper hover:bg-night"
        >
          Back to {areaLabel.toLowerCase()}
        </Link>
        {!notConfigured && (
          <button
            type="button"
            onClick={reset}
            className="rounded-card border border-line px-5 py-3 text-sm font-semibold hover:border-ink"
          >
            Try again
          </button>
        )}
      </div>
    </section>
  );
}
