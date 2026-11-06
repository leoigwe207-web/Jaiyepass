"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomeSearch({ cities }: { cities: { name: string; slug: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  return (
    <form role="search" aria-label="Find events" className="jp-home-search" onSubmit={(event) => {
      event.preventDefault();
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (city) params.set("city", city);
      router.push("/events" + (params.size ? "?" + params.toString() : ""));
    }}>
      <div className="flex-1">
        <label htmlFor="home-search-q" className="sr-only">Artist, venue or event</label>
        <input id="home-search-q" type="search" value={q} onChange={event => setQ(event.target.value)} placeholder="Search artists, events, venues…" className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-ink-faint sm:text-base" />
      </div>
      {cities.length > 0 && (
        <div className="hidden sm:block sm:w-44">
          <label htmlFor="home-search-city" className="sr-only">City</label>
          <select id="home-search-city" value={city} onChange={event => setCity(event.target.value)} className="w-full border-l border-line bg-transparent px-3 py-3 text-sm text-ink-soft">
            <option value="">All Nigeria</option>
            {cities.filter(cityItem => cityItem.slug !== "accra").map(cityItem => <option key={cityItem.slug} value={cityItem.slug}>{cityItem.name}</option>)}
          </select>
        </div>
      )}
      <button type="submit" aria-label="Search events" className="jp-button-primary min-w-24 !rounded-xl">Search</button>
    </form>
  );
}
