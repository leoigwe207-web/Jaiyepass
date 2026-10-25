import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser, getOrgMembership, isEventScannerFor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Preview listing" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Preview of any event listing regardless of status — visible only to
 * admins, members of the owning org, and assigned scanners. Used by the
 * review queue and host dashboard before a listing goes live.
 */
export default async function EventPreviewPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select(
      `id, organization_id, title, tagline, description, starts_at, ends_at, doors_open_at, age_guidance,
       refund_policy, status, is_demo, image_url,
       org:organizations(name), venue:venues(name, address), city:cities(name), category:categories(name),
       ticket_types(name, description, price_kobo, quantity, sold_count, status)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const orgId = (event as unknown as { organization_id: string }).organization_id;
  const [role, scanner] = await Promise.all([
    getOrgMembership(user.id, orgId),
    isEventScannerFor(user.id, event.id),
  ]);
  if (user.role !== "admin" && !role && !scanner) notFound();

  const tickets = event.ticket_types ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="rounded-card border border-warning/40 bg-warning/5 px-4 py-3 text-sm font-semibold text-warning">
        Preview only — this listing is <span className="uppercase">{event.status.replace("_", " ")}</span> and not
        visible to the public.
      </p>

      <article className="rounded-card border border-line bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-neon-deep">
          {((event.category as unknown as { name: string } | null)?.name) ?? "Event"}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">{event.title}</h1>
        {event.tagline && <p className="mt-1 text-lg text-ink-soft">{event.tagline}</p>}
        {event.is_demo && (
          <p className="mt-2 inline-block rounded-card border border-warning/40 bg-warning/5 px-2 py-0.5 text-xs font-bold text-warning">
            Demo listing
          </p>
        )}

        <dl className="mt-4 space-y-1 text-sm text-ink-soft">
          <div className="flex gap-2">
            <dt className="font-semibold text-ink">When</dt>
            <dd>
              {formatDateTime(event.starts_at)} → {formatDateTime(event.ends_at)}
              {event.doors_open_at ? ` (doors ${formatDateTime(event.doors_open_at)})` : ""}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-ink">Where</dt>
            <dd>
              {(event.venue as unknown as { name: string; address: string } | null)?.name},{" "}
              {(event.venue as unknown as { address: string } | null)?.address} ·{" "}
              {(event.city as unknown as { name: string } | null)?.name}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-ink">Organizer</dt>
            <dd>{(event.org as unknown as { name: string } | null)?.name}</dd>
          </div>
          {event.age_guidance && (
            <div className="flex gap-2">
              <dt className="font-semibold text-ink">Age</dt>
              <dd>{event.age_guidance}</dd>
            </div>
          )}
        </dl>

        <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">{event.description}</p>

        <section className="mt-6 border-t border-line pt-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-ink-faint">Tickets</h2>
          <ul className="mt-2 space-y-2">
            {tickets.length === 0 && <li className="text-sm text-danger">No ticket types yet.</li>}
            {tickets.map((t) => (
              <li key={t.name} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-ink-faint">
                    {t.sold_count}/{t.quantity} sold · {t.status}
                  </p>
                </div>
                <p className="font-bold">{t.price_kobo === 0 ? "Free" : formatKobo(t.price_kobo, { hideZeroDecimals: true })}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 border-t border-line pt-4 text-sm text-ink-soft">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-ink-faint">Refund policy</h2>
          <p className="mt-2">{event.refund_policy}</p>
        </section>
      </article>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin" className="font-semibold text-neon-deep underline underline-offset-2">
          ← Back to review queue
        </Link>
        <Link href="/host/events" className="font-semibold text-neon-deep underline underline-offset-2">
          Host dashboard
        </Link>
      </div>
    </div>
  );
}
