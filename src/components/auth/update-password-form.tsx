"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePasswordAction, type AuthFormState } from "@/app/(auth)/actions";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/submit-button";

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(updatePasswordAction, {});
  return (
    <div className="auth-form-panel">
      <p className="auth-kicker">SECURE YOUR ACCOUNT</p>
      <h1 className="auth-title">A fresh start.</h1>
      <p className="auth-description">Choose a strong new password. Your recovery link must be opened before changing it.</p>
      {state.message ? <div role="status" className="auth-notice auth-notice-success mt-7">{state.message}<div className="mt-4"><Link href="/account/tickets" className="auth-text-link">Continue to my tickets</Link></div></div> : (
        <form action={formAction} className="auth-form">
          <PasswordField id="new-password" name="password" label="New password" autoComplete="new-password" minLength={10} hint="At least 10 characters, including a letter and a number." />
          <PasswordField id="confirm-password" name="confirmPassword" label="Confirm new password" autoComplete="new-password" minLength={10} />
          {state.error ? <p role="alert" className="auth-notice auth-notice-error">{state.error}</p> : null}
          <SubmitButton label="Update password" pendingLabel="Updating password…" />
        </form>
      )}
      <p className="auth-under-form"><Link href="/login" className="auth-text-link">Back to sign in</Link></p>
    </div>
  );
}
