"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DATE_OPTIONS = [
  { value: "", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "weekend", label: "This weekend" },
  { value: "week", label: "Next 7 days" },
  { value: "month", label: "This month" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "free", label: "Free only" },
  { value: "under10000", label: "Under ₦10,000" },
];

export function BrowseFilters({
  categories,
  cities,
  activeCount,
}: {
  categories: { name: string; slug: string }[];
  cities: { name: string; slug: string }[];
  activeCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // Keep the local input in sync when back/forward changes the URL.
  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  return (
    <form
      className="space-y-5 rounded-card border border-line bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setParam("q", q.trim());
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Filters</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="text-xs font-semibold text-neon-deep underline underline-offset-2"
          >
            Clear ({activeCount})
          </button>
        )}
      </div>

      <div>
        <label htmlFor="filter-q" className="mb-1 block text-xs font-semibold text-ink-soft">
          Search
        </label>
        <div className="flex gap-2">
          <input
            id="filter-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Artist, venue…"
            className="w-full rounded-card border border-line px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-card bg-ink px-3 py-2 text-sm font-semibold text-paper">
            Go
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="filter-date" className="mb-1 block text-xs font-semibold text-ink-soft">
          Date
        </label>
        <select
          id="filter-date"
          value={searchParams.get("date") ?? ""}
          onChange={(e) => setParam("date", e.target.value)}
          className="w-full rounded-card border border-line bg-white px-3 py-2 text-sm"
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-category" className="mb-1 block text-xs font-semibold text-ink-soft">
          Category
        </label>
        <select
          id="filter-category"
          value={searchParams.get("category") ?? ""}
          onChange={(e) => setParam("category", e.target.value)}
          className="w-full rounded-card border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-city" className="mb-1 block text-xs font-semibold text-ink-soft">
          Location
        </label>
        <select
          id="filter-city"
          value={searchParams.get("city") ?? ""}
          onChange={(e) => setParam("city", e.target.value)}
          className="w-full rounded-card border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-ink-soft">Price</legend>
        <div className="space-y-1">
          {PRICE_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="price"
                value={o.value}
                checked={(searchParams.get("price") ?? "") === o.value}
                onChange={(e) => setParam("price", e.target.value)}
                className="accent-neon"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={searchParams.get("availability") === "true"}
          onChange={(e) => setParam("availability", e.target.checked ? "true" : "")}
          className="accent-neon"
        />
        Tickets available only
      </label>

      <div>
        <label htmlFor="filter-sort" className="mb-1 block text-xs font-semibold text-ink-soft">
          Sort
        </label>
        <select
          id="filter-sort"
          value={searchParams.get("sort") ?? "soonest"}
          onChange={(e) => setParam("sort", e.target.value)}
          className="w-full rounded-card border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="soonest">Soonest first</option>
          <option value="recent">Newest listed</option>
        </select>
      </div>
    </form>
  );
}
