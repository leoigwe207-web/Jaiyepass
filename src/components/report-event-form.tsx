"use client";

import { useState } from "react";

const REASONS = [
  "Misleading description",
  "Scalper or fraudulent listing",
  "Wrong venue or date",
  "Inappropriate content",
  "Duplicate listing",
  "Other",
];

export function ReportEventForm({ eventId }: { eventId: string }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, reason, details }),
      });
      if (res.ok) {
        setStatus("done");
        setMessage("Report received — our team will review this listing.");
      } else if (res.status === 401) {
        setStatus("error");
        setMessage("Sign in to report an event.");
      } else {
        const json = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(json.error ?? "Could not send the report. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — try again.");
    }
  }

  if (status === "done") {
    return (
      <p role="status" className="mt-3 text-sm text-success">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <label htmlFor="report-reason" className="sr-only">
          Reason
        </label>
        <select
          id="report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-card border border-line bg-white px-3 py-2 text-sm"
        >
          {REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <label htmlFor="report-details" className="sr-only">
          Details
        </label>
        <input
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          placeholder="Anything we should know? (optional)"
          className="mt-2 w-full rounded-card border border-line px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={status === "busy"}
        className="rounded-card border border-ink px-4 py-2 text-sm font-semibold hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {status === "busy" ? "Sending…" : "Report"}
      </button>
      {status === "error" && (
        <p role="alert" className="text-sm text-danger sm:basis-full">
          {message}
        </p>
      )}
    </form>
  );
}
