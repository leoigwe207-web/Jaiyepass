"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Hero search: query + city, pushes to the browse page. */
export function HomeSearch({ cities }: { cities: { name: string; slug: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("lagos");

  return (
    <form
      role="search"
      aria-label="Search events"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (city) params.set("city", city);
        router.push(`/events?${params.toString()}`);
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <div className="relative flex-1">
        <label htmlFor="hero-q" className="sr-only">
          Search events
        </label>
        <input
          id="hero-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search artists, venues, vibes…"
          className="w-full rounded-card border border-line bg-white px-4 py-3.5 text-base placeholder:text-ink-faint"
        />
      </div>
      <div className="sm:w-48">
        <label htmlFor="hero-city" className="sr-only">
          City
        </label>
        <select
          id="hero-city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-card border border-line bg-white px-4 py-3.5 text-base"
        >
          {cities.length > 0 ? (
            cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))
          ) : (
            <option value="lagos">Lagos</option>
          )}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-card bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition-colors hover:bg-night"
      >
        Search
      </button>
    </form>
  );
}
