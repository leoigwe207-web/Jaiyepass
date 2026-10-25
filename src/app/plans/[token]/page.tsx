import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { JoinPlanButton } from "@/components/join-plan-button";
import { CopyLinkButton } from "@/components/copy-link-button";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

type Plan = {
  id: string;
  title: string;
  note: string | null;
  share_code: string;
  owner_id: string;
  event: {
    id: string;
    title: string;
    slug: string;
    starts_at: string;
    status: string;
    is_free: boolean;
    image_url: string | null;
    venue: { name: string } | null;
    city: { name: string } | null;
    ticket_types: { price_kobo: number }[];
  } | null;
};

/**
 * The share_code is the capability: an unguessable random code grants read
 * access to the plan, so the page resolves it with the service role (RLS
 * would hide the plan from recipients who have not joined yet). Only exact
 * code matches resolve — plan ids are never accepted here.
 */
async function loadPlan(shareCode: string): Promise<Plan | null> {
  if (!/^[A-Za-z0-9_-]{8,48}$/.test(shareCode)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("group_plans")
    .select(
      `id, title, note, share_code, owner_id,
       event:events(id, title, slug, starts_at, status, is_free, image_url,
         venue:venues(name), city:cities(name),
         ticket_types(price_kobo))`,
    )
    .eq("share_code", shareCode)
    .maybeSingle();
  return data as Plan | null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const plan = await loadPlan(token);
  return { title: plan ? `${plan.event?.title ?? plan.title} · Group plan` : "Group plan" };
}

export default async function PlanPage({ params }: Params) {
  const { token } = await params;
  const plan = await loadPlan(token);
  if (!plan) notFound();

  const user = await getSessionUser();
  const admin = createAdminClient();

  const [{ data: members }, { data: membership }] = await Promise.all([
    admin
      .from("group_plan_members")
      .select("user_id, name, going, created_at")
      .eq("plan_id", plan.id)
      .order("created_at", { ascending: true }),
    user
      ? admin
          .from("group_plan_members")
          .select("id")
          .eq("plan_id", plan.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isOwner = user?.id === plan.owner_id;
  const isMember = !!membership || isOwner;
  const shareUrl = `/plans/${plan.share_code}`;

  const prices = (plan.event?.ticket_types ?? []).map((t) => t.price_kobo);
  const priceLabel = plan.event
    ? plan.event.is_free || (prices.length > 0 && prices.every((p) => p === 0))
      ? "Free"
      : prices.length > 0
        ? `From ${formatKobo(Math.min(...prices), { hideZeroDecimals: true })}`
        : "TBA"
    : "TBA";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-card border border-line bg-white p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-neon-deep">Group plan</p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-extrabold sm:text-4xl">
          {plan.event?.title ?? plan.title}
        </h1>
        {plan.note && <p className="mt-3 text-sm text-ink-soft">{plan.note}</p>}

        {plan.event && (
          <dl className="mt-4 space-y-1 text-sm text-ink-soft">
            <div className="flex gap-2">
              <dt className="font-semibold text-ink">When</dt>
              <dd>{formatDateTime(plan.event.starts_at)}</dd>
            </div>
            {(plan.event.venue || plan.event.city) && (
              <div className="flex gap-2">
                <dt className="font-semibold text-ink">Where</dt>
                <dd>
                  {[plan.event.venue?.name, plan.event.city?.name].filter(Boolean).join(", ")}
                </dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="font-semibold text-ink">Price</dt>
              <dd>{priceLabel}</dd>
            </div>
          </dl>
        )}

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-ink-faint">
            Going ({(members ?? []).length})
          </h2>
          {(members ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-ink-faint">Be the first to join.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {(members ?? []).map((m: { user_id: string | null; name: string }) => (
                <li
                  key={m.user_id ?? `guest-${m.name}`}
                  className="rounded-card border border-line bg-paper px-3 py-1 text-sm font-semibold"
                >
                  {m.name}
                  {m.user_id === plan.owner_id && <span className="ml-1 text-xs text-neon-deep">· creator</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <JoinPlanButton planId={plan.id} shareCode={plan.share_code} joined={isMember} signedIn={!!user} />
          {plan.event?.status === "published" && (
            <Link
              href={`/events/${plan.event.slug}`}
              className="text-sm font-semibold text-neon-deep underline underline-offset-2"
            >
              View event & get tickets
            </Link>
          )}
          <CopyLinkButton url={shareUrl} />
        </div>
      </div>

      {!user && (
        <p className="mt-4 text-center text-sm text-ink-faint">
          <Link href={`/login?next=${encodeURIComponent(shareUrl)}`} className="font-semibold text-neon-deep underline underline-offset-2">
            Sign in
          </Link>{" "}
          to join the plan.
        </p>
      )}
    </div>
  );
}
