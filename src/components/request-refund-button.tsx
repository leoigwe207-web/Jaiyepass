"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RequestRefundButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [message, setMessage] = useState("");

  async function request() {
    if (!window.confirm("Request a refund for this order? The host reviews requests before processing.")) {
      return;
    }
    setState("busy");
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
      } else {
        setState("error");
        setMessage(json.error ?? "Could not submit the refund request.");
      }
    } catch {
      setState("error");
      setMessage("Network error — try again.");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={request}
        disabled={state === "busy"}
        className="rounded-card border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink disabled:opacity-60"
      >
        {state === "busy" ? "Submitting…" : "Request refund"}
      </button>
      {state === "error" && (
        <span role="alert" className="text-xs text-danger">
          {message}
        </span>
      )}
    </span>
  );
}
