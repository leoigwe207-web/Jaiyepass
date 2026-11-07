import type { Metadata } from "next";
import Link from "next/link";
import { getHostContext } from "@/lib/host";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrganizationActive } from "@/lib/organization-status";
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

  if (!(await isOrganizationActive(orgId))) return <p role="alert" className="rounded-xl border border-warning/40 p-5 text-sm">Organizer access is currently paused or rejected. Contact support to resolve your account status.</p>;

  const admin = createAdminClient();
  const [{ data: cities }, { data: categories }] = await Promise.all([
    admin.from("cities").select("id, name").eq("is_active", true).order("sort_order"),
    admin.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Create an event</h1>
      <p className="mt-1 mb-6 text-sm text-ink-soft">
        Drafts are private. Add tickets, then submit for review — approved events go live on JaiyePass.
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
