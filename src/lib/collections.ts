import "server-only";

/** Each featured shortcut is a real browse filter, not a fictional curation claim. */
export interface Collection {
  slug: string;
  title: string;
  eyebrow: string;
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
    slug: "next-seven-days",
    title: "The next 7 days",
    eyebrow: "01 / By date",
    blurb: "See what's coming up soon, wherever you are in Nigeria.",
    filter: { date: "week" },
  },
  {
    slug: "free-events",
    title: "Free admission",
    eyebrow: "02 / No ticket cost",
    blurb: "Discover experiences that don't charge for entry.",
    filter: { price: "free" },
  },
  {
    slug: "under-10000",
    title: "Under ₦10,000",
    eyebrow: "03 / On a budget",
    blurb: "Browse events with entry tickets priced below ₦10,000.",
    filter: { price: "under10000" },
  },
];
