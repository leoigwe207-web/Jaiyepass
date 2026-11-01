import type { Metadata } from "next";
import Link from "next/link";
import { getHostContext } from "@/lib/host";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventForm, EMPTY_EVENT } from "@/components/host/event-form";
import { createEventAction } from "@/app/host/actions";

export const metadata: Metadata = { title: "Create event" };

export default async function NewEventPage() {
  const { orgId } = await getHostContext();

  if (!orgId) {
    return (
      <p className="text-sm text-ink-soft">
        Set up your organizer account on the{" "}
        <Link href="/host" className="font-semibold text-neon-deep underline underline-offset-2">
          overview page
        </Link>{" "}
        first.
      </p>
    );
  }

  const admin = createAdminClient();
  const [{ data: cities }, { data: categories }] = await Promise.all([
    admin.from("cities").select("id, name").eq("is_active", true).order("sort_order"),
    admin.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow mb-3">Your next event starts here</p>
      <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-extrabold tracking-tight sm:text-5xl">Create an event</h1>
      <p className="mt-3 mb-8 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
        Make a great first impression. Build your draft, add tickets, then submit it for review before going live.
      </p>
      <EventForm
        action={createEventAction}
        cities={cities ?? []}
        categories={categories ?? []}
        defaults={EMPTY_EVENT}
        submitLabel="Save draft"
      />
    </div>
  );
}
