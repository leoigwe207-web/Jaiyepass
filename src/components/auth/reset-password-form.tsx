"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthFormState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(resetPasswordAction, {});

  if (state.message) {
    return (
      <div role="status" className="rounded-card border border-success/30 bg-success/5 p-5">
        <p className="font-semibold text-success">Reset link requested</p>
        <p className="mt-1 text-sm text-ink-soft">{state.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="display-md">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-soft">
        We'll email you a secure link to set a new password.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
          />
        </div>

        {state.error && (
          <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <SubmitButton label="Send reset link" pendingLabel="Sending…" />
      </form>
    </div>
  );
}
