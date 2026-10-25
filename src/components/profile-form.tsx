"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/app/account/actions";

export function ProfileForm({ initial }: { initial: { fullName: string; phone: string; notificationOptIn: boolean } }) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(updateProfileAction, {});

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <div>
        <label htmlFor="fullName" className="label">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          minLength={2}
          maxLength={120}
          defaultValue={initial.fullName}
          className="input-field"
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="phone" className="label">
          Phone <span className="text-ink-faint">(optional — hosts may call on event day)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initial.phone ?? ""}
          placeholder="+234 801 234 5678"
          className="input-field"
          autoComplete="tel"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="notificationOptIn"
          defaultChecked={initial.notificationOptIn}
          className="size-4 rounded-card border-line accent-neon"
        />
        Email me about events I've saved and order updates
      </label>

      {state.error && (
        <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-card border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          Saved.
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={false}>
        Save changes
      </button>
    </form>
  );
}
