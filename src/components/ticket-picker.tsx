"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatKobo } from "@/lib/money";
import { trackCheckoutStarted } from "@/lib/analytics/events";
import type { TicketTypeOption } from "@/components/ticket-picker-types";

/**
 * Ticket quantity picker → creates a pending order on the server (with an
 * inventory hold) and redirects to checkout. Quantities only; totals are
 * always computed server-side from database records.
 */
export function TicketPicker({
  eventId,
  eventTitle,
  tickets,
}: {
  eventId: string;
  eventTitle: string;
  tickets: TicketTypeOption[];
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = tickets.reduce((sum, t) => sum + (qty[t.id] ?? 0) * t.priceKobo, 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);

  function setQuantity(id: string, value: number, max: number) {
    setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.min(value, max)) }));
  }

  async function startCheckout() {
    setError(null);
    setSubmitting(true);
    try {
      const items = tickets
        .filter((t) => (qty[t.id] ?? 0) > 0)
        .map((t) => ({ ticketTypeId: t.id, quantity: qty[t.id]! }));

      if (items.length === 0) {
        setError("Choose at least one ticket.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, items }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error ?? "Could not start checkout. Please try again.");
        setSubmitting(false);
        return;
      }
      // The order exists now — count the action, never the abandoned attempts.
      trackCheckoutStarted({
        eventId,
        ticketQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        totalKobo: total,
      });
      router.push(`/checkout/${json.orderId}`);
    } catch {
      setError("Network error — check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ul className="space-y-3">
        {tickets.map((t) => {
          const selected = qty[t.id] ?? 0;
          const soldOut = t.remaining === 0;
          return (
            <li
              key={t.id}
              className={`rounded-card border p-3 ${selected > 0 ? "border-ink" : "border-line"} ${soldOut ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm font-bold">
                    {t.priceKobo === 0 ? "Free" : formatKobo(t.priceKobo, { hideZeroDecimals: true })}
                  </p>
                  {t.description && (
                    <p className="mt-1 text-xs text-ink-faint">{t.description}</p>
                  )}
                  {!soldOut && t.remaining <= 10 && (
                    <p className="mt-1 text-xs font-semibold text-warning">
                      Only {t.remaining} left
                    </p>
                  )}
                  {soldOut && <p className="mt-1 text-xs font-semibold text-danger">Sold out</p>}
                </div>

                {!soldOut && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Remove one ${t.name} ticket`}
                      onClick={() => setQuantity(t.id, selected - 1, t.remaining)}
                      disabled={selected === 0}
                      className="h-9 w-9 rounded-card border border-line text-lg font-bold disabled:opacity-40"
                    >
                      −
                    </button>
                    <span
                      className="w-6 text-center text-sm font-bold"
                      aria-live="polite"
                      aria-label={`${t.name} quantity`}
                    >
                      {selected}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one ${t.name} ticket`}
                      onClick={() => setQuantity(t.id, selected + 1, Math.min(t.remaining, t.perOrderLimit))}
                      disabled={selected >= Math.min(t.remaining, t.perOrderLimit)}
                      className="h-9 w-9 rounded-card border border-line text-lg font-bold disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-3 rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={startCheckout}
        disabled={submitting || count === 0}
        className="mt-4 w-full rounded-card bg-neon px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-neon-deep disabled:cursor-not-allowed disabled:bg-paper-dim disabled:text-ink-faint"
      >
        {submitting
          ? "Reserving your tickets…"
          : count === 0
            ? `Select tickets for ${eventTitle}`
            : total === 0
              ? `Reserve ${count} free ticket${count === 1 ? "" : "s"}`
              : `Checkout · ${formatKobo(total, { hideZeroDecimals: true })} + fees`}
      </button>
      <p className="mt-2 text-center text-xs text-ink-faint">
        Review the total including fees at checkout. Reservations expire 10 minutes after selection.
      </p>
    </div>
  );
}
