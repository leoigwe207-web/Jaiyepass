/** Customer-friendly category labels. Preserve database IDs and slugs. */
const labels: Record<string, string> = {
  music: "Concerts & Live Music",
  nightlife: "Parties & Nightlife",
  comedy: "Comedy & Entertainment",
  "food-drink": "Food & Drink",
  "food & drink": "Food & Drink",
  "art-culture": "Arts & Culture",
  "art & culture": "Arts & Culture",
  sports: "Sports & Fitness",
  tech: "Technology & Business",
  fashion: "Fashion & Style",
  theatre: "Theatre & Performing Arts",
  community: "Community & Lifestyle",
};

export function categoryDisplayName(nameOrSlug: string): string {
  return labels[nameOrSlug.trim().toLowerCase()] ?? nameOrSlug;
}
