"use client";

import { useActionState } from "react";
import { createOrganizationAction, type ActionState } from "@/app/host/actions";

const fields: { name: string; label: string; type?: string; required?: boolean; hint?: string }[] = [
  { name: "name", label: "Organizer name", required: true, hint: "e.g. Lagos Live Collective" },
  { name: "contactEmail", label: "Contact email", type: "email", required: true },
  { name: "contactPhone", label: "Contact phone (optional)", type: "tel" },
  { name: "payoutBankName", label: "Payout bank (optional)", hint: "Add now or before your first payout" },
  { name: "payoutAccountNumber", label: "Payout account number (optional)" },
  { name: "payoutAccountName", label: "Payout account name (optional)" },
];

export function OrgForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createOrganizationAction, {});

  if (state.ok) {
    return (
      <p role="status" className="rounded-card border border-success/30 bg-success/5 p-4 text-sm text-success">
        Organizer account created — refresh to continue.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.name === "name" || f.name === "contactEmail" ? "" : "sm:col-span-1"}>
            <label htmlFor={`org-${f.name}`} className="mb-1 block text-sm font-semibold">
              {f.label}
            </label>
            <input
              id={`org-${f.name}`}
              name={f.name}
              type={f.type ?? "text"}
              required={f.required}
              maxLength={120}
              className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
            />
            {f.hint && <p className="mt-1 text-xs text-ink-faint">{f.hint}</p>}
          </div>
        ))}
      </div>

      {state.error && (
        <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create organizer account"}
      </button>
      <p className="text-xs text-ink-faint">
        Your account is reviewed by our team before events go live — usually within one business day.
      </p>
    </form>
  );
}
