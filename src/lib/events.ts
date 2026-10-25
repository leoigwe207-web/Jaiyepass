export type EventCardData = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  image_url: string | null;
  starts_at: string;
  is_demo: boolean;
  is_free: boolean;
  featured?: boolean;
  price_min_kobo?: number | null;
  city_name?: string | null;
  category_name?: string | null;
  venue_name?: string | null;
  availability?: "available" | "few" | "sold_out" | "closed";
};

/** Demo artwork served as local SVG posters — clearly stylised, not real photos. */
export function demoPoster(slug: string): string {
  return `/demo/${slug}.svg`;
}
