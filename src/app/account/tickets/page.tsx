import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deriveQrPayload } from "@/lib/ticket-token";
import { serverEnv } from "@/lib/env";
import { formatDateRange } from "@/lib/format";
import { EmptyState, DemoBadge } from "@/components/ui";
import { QRTicket } from "@/components/qr-ticket";
import { getDemoUser } from "@/lib/demo";
import { DemoAttendeeTickets } from "@/components/demo/dashboards";

export const metadata: Metadata = { title: "My tickets" };
export const dynamic = "force-dynamic";

interface TicketRow {
  id: string;
  status: string;
  used_at: string | null;
  event: {
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string;
    is_demo: boolean;
    venue?: { name: string } | null;
    city?: { name: string } | null;
    venue_name?: string | null;
    city_name?: string | null;
  } | null;
  ticket_types?: { name: string } | null;
  ticket_type_name?: string | null;
}

export default async function MyTicketsPage() {
  // Preview demo session → sample ticket wallet, no database access.
  if (await getDemoUser()) return <DemoAttendeeTickets />;

  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("tickets")
    .select(
      `id, status, used_at,
       event:events(title, slug, starts_at, ends_at, is_demo, venue:venues(name), city:cities(name)),
       ticket_types(name)`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const tickets = ((data ?? []) as unknown as TicketRow[]).map((t) => ({
    ...t,
    ticket_type_name: t.ticket_types?.name ?? "Ticket",
    event: t.event
      ? {
          ...t.event,
          venue_name: t.event.venue?.name ?? null,
          city_name: t.event.city?.name ?? null,
        }
      : null,
  }));

  const pepper = serverEnv().ticketPepper;

  if (tickets.length === 0) {
    return (
      <EmptyState
        title="No tickets yet"
        description="When you buy a ticket, it shows up here with a QR code you can use at the gate."
        action={
          <Link href="/events" className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep">
            Find something on
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        {tickets.length} ticket{tickets.length === 1 ? "" : "s"} · Show the QR
        code at the gate. Don't share screenshots — anyone holding the code can
        enter.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {tickets.map((t) => (
          <article
            key={t.id}
            className="overflow-hidden rounded-card border border-line bg-white"
            aria-label={`Ticket for ${t.event?.title ?? "event"}`}
          >
            <div className="border-b border-line bg-paper-deep px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-[family-name:var(--font-fraunces)] text-lg font-bold">
                    {t.event?.title ?? "Event"}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {t.event && formatDateRange(t.event.starts_at, t.event.ends_at)}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {[t.event?.venue_name, t.event?.city_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <QRTicket
                payload={pepper ? deriveQrPayload(t.id, pepper) : ""}
                disabled={t.status !== "issued"}
              />
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-ink-faint">Type: </span>
                  {t.ticket_type_name}
                </p>
                <p className="break-all">
                  <span className="text-ink-faint">Code: </span>
                  <code className="text-xs">{t.id.slice(0, 8).toUpperCase()}-••••-••••</code>
                </p>
                {t.status === "used" && t.used_at && (
                  <p className="text-sm font-semibold text-warning">
                    Entered {formatDateRange(t.used_at, t.used_at)}
                  </p>
                )}
                {t.event?.is_demo && <DemoBadge />}
                <Link
                  href={`/account/orders?event=${t.event?.slug ?? ""}`}
                  className="block text-neon-deep underline underline-offset-2"
                >
                  Get help with this ticket
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    issued: { label: "Valid", cls: "bg-success/10 text-success border-success/30" },
    used: { label: "Used", cls: "bg-warning/10 text-warning border-warning/30" },
    cancelled: { label: "Cancelled", cls: "bg-paper-dim text-ink-soft border-line" },
    refunded: { label: "Refunded", cls: "bg-danger/10 text-danger border-danger/30" },
  };
  const s = map[status] ?? map.issued!;
  return (
    <span className={`shrink-0 rounded-card border px-2 py-0.5 text-xs font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}
