import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Group plans" };
export const dynamic = "force-dynamic";

type Plan = {
  id: string;
  title: string;
  share_code: string;
  created_at: string;
  joined_at?: string | null;
  member_count?: number;
  event: {
    title: string;
    slug: string;
    starts_at: string;
    venue: { name: string } | null;
    city: { name: string } | null;
  } | null;
};

const EVENT_EMBED = `event:events(title, slug, starts_at, venue:venues(name), city:cities(name))`;

export default async function PlansPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("group_plans")
    .select(`id, title, share_code, created_at, ${EVENT_EMBED}`)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: joined } = await supabase
    .from("group_plan_members")
    .select(`created_at, plan:group_plans(id, title, share_code, created_at, ${EVENT_EMBED})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const mine = (data ?? []) as unknown as Plan[];
  const joinedPlans = (((joined ?? []) as unknown as { created_at: string; plan: Plan | null }[])
    .map((r) => (r.plan ? { ...r.plan, joined_at: r.created_at } : null))
    .filter((p) => p !== null && !mine.some((m) => m.id === p!.id))) as Plan[];

  if (mine.length === 0 && joinedPlans.length === 0) {
    return (
      <EmptyState
        title="No group plans yet"
        description="Open any event and tap “Make a group plan” to get a shareable link for your crew."
        action={
          <Link href="/events" className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep">
            Browse events
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PlanSection title="Plans you created" plans={mine} emptyCopy="None yet — create one from any event page." />
      <PlanSection title="Plans you joined" plans={joinedPlans} emptyCopy="You haven't joined anyone's plan yet." />
    </div>
  );
}

function PlanSection({ title, plans, emptyCopy }: { title: string; plans: Plan[]; emptyCopy: string }) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">{title}</h2>
      {plans.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">{emptyCopy}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-white">
          {plans.map((plan) => (
            <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold">{plan.event?.title ?? plan.title}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {plan.event ? (
                    <>
                      {formatDateTime(plan.event.starts_at)}
                      {plan.event.venue ? ` · ${plan.event.venue.name}` : ""}
                      {plan.event.city ? ` · ${plan.event.city.name}` : ""}
                    </>
                  ) : (
                    "Event removed"
                  )}
                </p>
              </div>
              <Link
                href={`/plans/${plan.share_code}`}
                className="rounded-card border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink"
              >
                Open plan
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
