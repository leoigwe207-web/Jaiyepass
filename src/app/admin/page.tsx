import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { ReviewForm } from "@/components/admin/admin-forms";
import { reviewEventAction, toggleFeaturedAction } from "@/app/admin/actions";
import { getDemoUser } from "@/lib/demo";
import { DemoAdminOverview } from "@/components/demo/dashboards";

export const metadata: Metadata = { title: "Review queue" };

export default async function AdminReviewQueue() {
  // Preview demo session → sample console, no database access.
  if (await getDemoUser()) return <DemoAdminOverview />;

  const admin = createAdminClient();

  const [{ data: queue }, { count: published }, { data: featuredable }] = await Promise.all([
    admin
      .from("events")
      .select(
        `id, title, starts_at, created_at, description,
         org:organizations(name, verification, contact_email),
         city:cities(name),
         ticket_types(name, price_kobo, quantity)`,
      )
      .eq("status", "pending_review")
      .order("created_at", { ascending: true }),
    admin.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
    admin
      .from("events")
      .select("id, title, featured")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(12),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Review queue</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {queue?.length ?? 0} event{(queue?.length ?? 0) === 1 ? "" : "s"} awaiting review · {published ?? 0} live
        </p>
      </section>

      <section>
        {(!queue || queue.length === 0) ? (
          <p className="text-sm text-ink-faint">Nothing waiting for review. 🎉</p>
        ) : (
          <ul className="space-y-4">
            {queue.map((e) => {
              const org = e.org as unknown as { name: string; verification: string; contact_email: string } | null;
              const tickets = (e.ticket_types ?? [])
                .map((t) => `${t.name}: ${t.price_kobo === 0 ? "free" : formatKobo(t.price_kobo, { hideZeroDecimals: true })} × ${t.quantity}`)
                .join(" · ");
              return (
                <li key={e.id} className="rounded-card border border-line bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-bold">{e.title}</h2>
                      <p className="mt-1 text-xs text-ink-faint">
                        {org?.name} ·{" "}
                        <span className={org?.verification === "verified" ? "text-success font-semibold" : "text-warning font-semibold"}>
                          {org?.verification}
                        </span>{" "}
                        · {(e.city as unknown as { name: string } | null)?.name ?? "—"} · {formatDateTime(e.starts_at)} · submitted{" "}
                        {formatDateTime(e.created_at)}
                      </p>
                      <p className="mt-2 max-w-prose text-sm text-ink-soft line-clamp-3">{e.description}</p>
                      <p className="mt-2 text-xs font-semibold text-ink-faint">{tickets || "No ticket types"}</p>
                      <Link
                        href={`/events/preview/${e.id}`}
                        className="mt-1 inline-block text-xs font-semibold text-neon-deep underline underline-offset-2"
                      >
                        Preview listing ↗
                      </Link>
                    </div>
                    <div className="w-full max-w-xs shrink-0">
                      <ReviewForm action={reviewEventAction} eventId={e.id} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Homepage featuring</h2>
        <p className="mt-1 text-sm text-ink-faint">Featured events show first on the homepage.</p>
        {featuredable && featuredable.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {featuredable.map((e) => (
              <li
                key={e.id}
                className={`rounded-card border px-3 py-2 text-xs font-semibold ${
                  e.featured ? "border-neon bg-neon/10" : "border-line bg-white"
                }`}
              >
                <form action={toggleFeaturedAction.bind(null, e.id) as never} className="inline">
                  <button type="submit" className="text-left">
                    {e.featured ? "★" : "☆"} {e.title}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
