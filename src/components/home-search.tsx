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
      <div className="jp-v3-search-input-wrap">
        <span aria-hidden="true" className="jp-v3-search-icon">⌕</span>
        <label htmlFor="home-search-q" className="sr-only">Search by artist, event, or venue</label>
        <input id="home-search-q" type="search" value={q} onChange={event => setQ(event.target.value)} placeholder="Search for a good time…" className="jp-v3-search-input" />
      </div>
      <div className="jp-v3-search-city-wrap">
        <label htmlFor="home-search-city" className="sr-only">City</label>
        <span aria-hidden="true">⌖</span>
        <select id="home-search-city" value={city} onChange={event => setCity(event.target.value)} className="jp-v3-search-select">
          <option value="">Anywhere in Nigeria</option>
          {cities.filter(item => item.slug !== "accra").map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </div>
      <button type="submit" className="jp-v3-search-submit">Find events <span aria-hidden="true">↗</span></button>
    </form>
  );
}
