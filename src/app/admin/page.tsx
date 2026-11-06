import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { ReviewForm } from "@/components/admin/admin-forms";
import { reviewEventAction, toggleFeaturedAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Review queue" };

export default async function AdminReviewQueue() {

  const admin = createAdminClient();

  const [{ data: queue, error: queueError }, { count: published, error: publishedError }, { data: featuredable, error: featuredError }, { count: users }, { count: organizers }, { count: paidOrders }, { count: pendingPayouts }, { count: openReports }] = await Promise.all([
    admin
      .from("events")
      .select(
        `id, title, starts_at, created_at, description,
         org:organizations(name, verification, contact_email),
         city:cities(name),
         ticket_types(name, price_kobo, quantity)`,
      )
      .eq("status", "pending_review").eq("is_demo", false)
      .order("created_at", { ascending: true }),
    admin.from("events").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", false),
    admin
      .from("events")
      .select("id, title, featured")
      .eq("status", "published").eq("is_demo", false)
      .order("published_at", { ascending: false })
      .limit(12),
    admin.from("profiles").select("id", { head: true, count: "exact" }),
    admin.from("organizations").select("id", { head: true, count: "exact" }),
    admin.from("orders").select("id", { head: true, count: "exact" }).eq("status", "paid"),
    admin.from("payouts").select("id", { head: true, count: "exact" }).eq("status", "pending"),
    admin.from("event_reports").select("id", { head: true, count: "exact" }).in("status", ["open", "reviewing"]),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Review queue</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {queue?.length ?? 0} event{(queue?.length ?? 0) === 1 ? "" : "s"} awaiting review · {published ?? 0} live
        </p>
      </section>

      {(queueError || publishedError || featuredError) && <p role="alert" className="text-sm font-semibold text-danger">Admin data could not be loaded. Check Supabase configuration and server logs.</p>}
      <section aria-label="Platform overview" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[ ["Users", users], ["Organizers", organizers], ["Paid orders", paidOrders], ["Pending payouts", pendingPayouts], ["Reports to review", openReports] ].map(([label, count]) => (
          <div key={String(label)} className="rounded-card border border-line bg-white p-4">
            <p className="text-xs font-semibold text-ink-faint">{label}</p>
            <p className="mt-2 text-2xl font-extrabold">{count ?? "—"}</p>
          </div>
        ))}
      </section>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Platform reports</h2>
        <p className="mt-2 text-sm text-ink-soft">Review attendee complaints, ticket scans, payments, refunds and payouts.</p>
        <Link href="/admin/reports" className="mt-4 inline-flex rounded-xl bg-neon-deep px-4 py-3 text-sm font-semibold text-white">View all reports</Link>
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
