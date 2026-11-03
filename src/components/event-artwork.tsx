"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  title: string;
  category?: string | null;
  className?: string;
  priority?: boolean;
};

const categoryLabels: Record<string, string> = {
  music: "Concerts & live music",
  parties: "Parties",
  comedy: "Comedy shows",
  nightlife: "Nightlife",
  "art-culture": "Arts & culture",
};

/** Broken image URLs fall back to category-specific artwork, not a blank box. */
export function EventArtwork({
  src, alt, title, category, className = "", priority = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const key = category && category in categoryLabels ? category : "all";
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Event artwork unavailable for ${alt}`}
      data-category={key}
      className={`jp-editorial-artwork relative flex h-full w-full flex-col justify-between overflow-hidden p-5 text-white sm:p-7 ${className}`}
    >
      <div aria-hidden="true" className="jp-artwork-rings pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[.22em] text-white/80">
          {categoryLabels[key] ?? "Discover Nigeria"}
        </span>
        <span className="text-[11px] font-black tracking-tight text-white">JP✳</span>
      </div>
      <div className="relative z-10">
        <span className="mb-3 block h-[3px] w-10 bg-white/80" aria-hidden="true" />
        <p className="max-w-[18ch] font-[family-name:var(--font-fraunces)] text-[clamp(1.35rem,3vw,2.5rem)] font-extrabold leading-[1.05] tracking-tight line-clamp-3">
          {title}
        </p>
        <span className="mt-3 block text-[10px] font-semibold uppercase tracking-[.18em] text-white/70">Experience it live</span>
      </div>
    </div>
  );
}
