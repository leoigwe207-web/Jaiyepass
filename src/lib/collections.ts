import "server-only";

/**
 * Curated collections shown on the homepage. Values are used as browse-page
 * filter presets — they are not invented claims about real events.
 */
export interface Collection {
  slug: string;
  title: string;
  blurb: string;
  filter: {
    city?: string;
    category?: string;
    price?: "free" | "under10000";
    date?: "today" | "weekend" | "week";
  };
}

export const COLLECTIONS: Collection[] = [
  {
    slug: "tonight-in-lagos",
    title: "Tonight in Lagos",
    blurb: "What's happening before the night ends.",
    filter: { city: "lagos", date: "today" },
  },
  {
    slug: "for-the-crew",
    title: "For the crew",
    blurb: "Group-friendly picks worth a plan link.",
    filter: { city: "lagos", date: "week" },
  },
  {
    slug: "date-night",
    title: "Date night",
    blurb: "Two tickets, low effort, good story.",
    filter: { city: "lagos", category: "art-culture", date: "week" },
  },
  {
    slug: "free-this-weekend",
    title: "Free this weekend",
    blurb: "Zero naira. Still a good time.",
    filter: { price: "free", date: "weekend" },
  },
  {
    slug: "under-10000",
    title: "Under ₦10,000",
    blurb: "Big nights that respect the budget.",
    filter: { price: "under10000" },
  },
];
