"use client";

import { useActionState } from "react";
import type { AdminActionState } from "@/app/admin/actions";

function ErrorLine({ state }: { state: AdminActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="mt-2 text-xs text-danger">
      {state.error}
    </p>
  );
}

/** Event review decision form (approve / reject with optional note). */
export function ReviewForm({
  action,
  eventId,
}: {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  eventId: string;
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input
        name="note"
        maxLength={500}
        placeholder="Note to the organizer (optional)"
        className="w-full rounded-card border border-line bg-white px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending || !!state.ok}
          className="rounded-card bg-success px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "…" : "Approve & publish"}
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending || !!state.ok}
          className="rounded-card border border-danger/40 px-4 py-2 text-xs font-bold text-danger hover:bg-danger/5 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
      {state.ok && <p className="text-xs font-semibold text-success">Decision recorded.</p>}
      <ErrorLine state={state} />
    </form>
  );
}

/** Simple two-value decision form (verification, payout status, report action). */
export function DecisionForm({
  action,
  fields,
  options,
  submitLabel,
}: {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  fields: Record<string, string>;
  options: { value: string; label: string; tone?: "primary" | "danger" | "outline" }[];
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {options.map((opt) => {
        const cls =
          opt.tone === "primary"
            ? "bg-ink text-paper hover:bg-night"
            : opt.tone === "danger"
              ? "border border-danger/40 text-danger hover:bg-danger/5"
              : "border border-line hover:border-ink";
        return (
          <button
            key={opt.value}
            type="submit"
            name="decision"
            value={opt.value}
            disabled={pending || !!state.ok}
            className={`rounded-card px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${cls}`}
          >
            {submitLabel ? (pending ? "…" : submitLabel) : opt.label}
          </button>
        );
      })}
      {state.ok && <span className="text-xs font-semibold text-success">Done</span>}
      <ErrorLine state={state} />
    </form>
  );
}

/**
 * DecisionForm submits `decision`, but some actions expect other field names;
 * this wrapper renames by rendering per-option named inputs is overkill — the
 * actions above all read `decision`/`status` accordingly via hidden input.
 */
export function FieldDecisionForm({
  action,
  fields,
  options,
}: {
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  fields: Record<string, string>;
  options: { value: string; label: string; name: string; tone?: "primary" | "danger" | "outline" }[];
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {options.map((opt) => {
        const cls =
          opt.tone === "primary"
            ? "bg-ink text-paper hover:bg-night"
            : opt.tone === "danger"
              ? "border border-danger/40 text-danger hover:bg-danger/5"
              : "border border-line hover:border-ink";
        return (
          <button
            key={opt.value}
            type="submit"
            name={opt.name}
            value={opt.value}
            disabled={pending || !!state.ok}
            className={`rounded-card px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${cls}`}
          >
            {opt.label}
          </button>
        );
      })}
      {state.ok && <span className="text-xs font-semibold text-success">Done</span>}
      <ErrorLine state={state} />
    </form>
  );
}
