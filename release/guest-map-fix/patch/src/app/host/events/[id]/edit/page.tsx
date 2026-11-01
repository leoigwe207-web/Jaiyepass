import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHostContext } from "@/lib/host";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventForm, type EventFormDefaults } from "@/components/host/event-form";
import { EventCoverUploader } from "@/components/host/event-cover-uploader";
import { updateEventAction } from "@/app/host/actions";

export const metadata: Metadata = { title: "Edit event" };

type Params = { params: Promise<{ id: string }> };

export default async function EditEventPage({ params }: Params) {
  const { id } = await params;
  const { orgId } = await getHostContext();
  if (!orgId) notFound();

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select(
      "id, title, tagline, description, city_id, category_id, starts_at, ends_at, doors_open_at, age_guidance, refund_policy, image_url, venue:venues(name, address)",
    )
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!event) notFound();

  const [{ data: cities }, { data: categories }] = await Promise.all([
    admin.from("cities").select("id, name").eq("is_active", true).order("sort_order"),
    admin.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
  ]);

  const venue = event.venue as unknown as { name: string; address: string } | null;

  const defaults: EventFormDefaults = {
    title: event.title,
    tagline: event.tagline ?? "",
    description: event.description ?? "",
    cityId: event.city_id,
    venueName: venue?.name ?? "",
    venueAddress: venue?.address ?? "",
    categoryId: event.category_id ?? "",
    startsAt: event.starts_at,
    endsAt: event.ends_at ?? "",
    doorsOpenAt: event.doors_open_at ?? "",
    ageGuidance: event.age_guidance ?? "",
    refundPolicy: event.refund_policy ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm text-ink-soft">
        <Link href={`/host/events/${event.id}`} className="font-semibold text-neon-deep underline underline-offset-2">
          ← Back to event
        </Link>
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Edit event</h1>
      <p className="mt-1 mb-6 text-sm text-ink-soft">
        Editing a published event sends it back for a quick review before changes go live.
      </p>
      <div className="mb-6"><EventCoverUploader eventId={event.id} initialUrl={event.image_url} /></div>
      <EventForm
        action={updateEventAction.bind(null, event.id)}
        cities={cities ?? []}
        categories={categories ?? []}
        defaults={defaults}
        submitLabel="Save changes"
      />
    </div>
  );
}
