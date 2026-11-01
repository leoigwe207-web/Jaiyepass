"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/app/account/actions";

export function ProfileForm({ initial }: { initial: { fullName: string; phone: string; notificationOptIn: boolean } }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, {});

  return (
    <form action={formAction} className="jp-edit-form mt-8 space-y-6">
      <div className="jp-form-field">
        <label htmlFor="fullName" className="jp-field-label">Full name <span aria-hidden="true" className="text-neon-deep">*</span></label>
        <input
          id="fullName" name="fullName" required minLength={2} maxLength={120}
          defaultValue={initial.fullName} placeholder="e.g. Adaeze Okafor"
          className="jp-form-control" autoComplete="name"
        />
        <p className="jp-field-hint">Use the name you would like event organizers to recognize.</p>
      </div>
      <div className="jp-form-field">
        <label htmlFor="phone" className="jp-field-label">Phone number <span className="jp-optional">Optional</span></label>
        <input
          id="phone" name="phone" type="tel" inputMode="tel"
          defaultValue={initial.phone ?? ""} placeholder="e.g. +234 801 234 5678"
          className="jp-form-control" autoComplete="tel"
        />
        <p className="jp-field-hint">Only used for essential updates from the event organizer.</p>
      </div>
      <label className="jp-checkbox-row">
        <input type="checkbox" name="notificationOptIn" defaultChecked={initial.notificationOptIn} className="size-4 shrink-0 accent-neon" />
        <span>Send me event recommendations and updates about events I save.</span>
      </label>

      {state.error && <p role="alert" className="auth-notice auth-notice-error">{state.error}</p>}
      {state.success && <p role="status" className="auth-notice auth-notice-success">Your profile has been updated.</p>}

      <button type="submit" className="jp-form-submit" disabled={pending}>
        {pending ? "Saving changes…" : "Save changes"}
      </button>
    </form>
  );
}
