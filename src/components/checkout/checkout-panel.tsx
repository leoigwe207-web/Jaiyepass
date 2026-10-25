"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKobo } from "@/lib/money";

/**
 * Checkout panel: optional promo code + payment button.
 * Amounts are display-only; the server recomputes everything.
 */
export function CheckoutPanel({
  orderId,
  totalKobo,
  isFree,
  testMode,
  appliedCode,
}: {
  orderId: string;
  totalKobo: number;
  isFree: boolean;
  testMode: boolean;
  appliedCode: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(appliedCode ?? "");
  const [busy, setBusy] = useState<"promo" | "pay" | "test" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function applyPromo(action: "apply" | "remove") {
    setError(null);
    setNote(null);
    setBusy("promo");
    try {
      const res = await fetch("/api/checkout/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, code: action === "remove" ? "REMOVE" : code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not apply that code.");
      } else {
        setNote(action === "remove" ? "Promo removed" : "Promo applied");
        router.refresh();
      }
    } catch {
      setError("Network error — try again.");
    }
    setBusy(null);
  }

  async function pay() {
    setError(null);
    setBusy("pay");
    try {
      const res = await fetch("/api/checkout/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not start payment.");
        setBusy(null);
        return;
      }
      window.location.href = json.authorizationUrl;
    } catch {
      setError("Network error — try again.");
      setBusy(null);
    }
  }

  async function testComplete() {
    setError(null);
    setBusy("test");
    try {
      const res = await fetch("/api/dev/complete-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not complete the test order.");
        setBusy(null);
        return;
      }
      router.push(`/checkout/${orderId}/success`);
    } catch {
      setError("Network error — try again.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="promo" className="mb-1 block text-sm font-semibold">
          Promo code
        </label>
        <div className="flex gap-2">
          <input
            id="promo"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={40}
            placeholder="e.g. CREW10"
            disabled={!!appliedCode || busy !== null}
            className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm disabled:bg-paper-dim"
          />
          {appliedCode ? (
            <button
              type="button"
              onClick={() => applyPromo("remove")}
              disabled={busy !== null}
              className="rounded-card border border-line px-4 py-2.5 text-sm font-semibold hover:border-ink disabled:opacity-60"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={() => applyPromo("apply")}
              disabled={busy !== null || code.trim().length < 3}
              className="rounded-card border border-line px-4 py-2.5 text-sm font-semibold hover:border-ink disabled:opacity-60"
            >
              {busy === "promo" ? "Checking…" : "Apply"}
            </button>
          )}
        </div>
        {note && (
          <p role="status" className="mt-1 text-xs font-semibold text-success">
            {note}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {testMode ? (
        <div className="rounded-card border border-warning/40 bg-warning/5 p-4">
          <p className="text-sm font-bold text-warning">Test mode — no real payment</p>
          <p className="mt-1 text-sm text-ink-soft">
            Paystack keys are not configured, so this order cannot be paid for real. You can simulate a successful
            payment to walk the full ticket-issuing flow.
          </p>
          <button
            type="button"
            onClick={testComplete}
            disabled={busy !== null}
            className="mt-3 rounded-card bg-ink px-5 py-3 text-sm font-bold text-paper hover:bg-night disabled:opacity-60"
          >
            {busy === "test" ? "Completing…" : `Simulate payment · ${formatKobo(totalKobo, { hideZeroDecimals: true })}`}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pay}
          disabled={busy !== null}
          className="w-full rounded-card bg-neon px-5 py-3.5 text-sm font-bold text-white hover:bg-neon-deep disabled:cursor-not-allowed disabled:bg-paper-dim disabled:text-ink-faint"
        >
          {busy === "pay"
            ? "Opening secure payment…"
            : isFree
              ? "Reserve my ticket"
              : `Pay ${formatKobo(totalKobo, { hideZeroDecimals: true })} securely`}
        </button>
      )}

      <p className="text-center text-xs text-ink-faint">
        Payments are processed by Paystack. Card details never touch JaiyePass servers.
      </p>
    </div>
  );
}
