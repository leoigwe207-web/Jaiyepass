import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSavedEvents } from "@/lib/queries";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Saved events" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await requireUser();
  const events = await getSavedEvents(user.id);

  if (events.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        description="Tap the bookmark on any event to keep it here."
        action={
          <Link href="/events" className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep">
            Find something to do
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
