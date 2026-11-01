"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthFormState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";

export function ResetPasswordForm({ notice }: { notice?: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(resetPasswordAction, {});
  return (
    <div className="auth-form-panel">
      <p className="auth-kicker"><span className="auth-kicker-dot"/> ACCOUNT RECOVERY</p>
      <h1 className="auth-title">Back in no time.</h1>
      <p className="auth-description">Enter your email address and we’ll send a secure link to reset your password.</p>
      {notice ? <p role="alert" className="auth-notice auth-notice-error mt-6">{notice}</p> : null}
      {state.message ? <p role="status" className="auth-notice auth-notice-success mt-7">{state.message}</p> : (
        <form action={formAction} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email address</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" maxLength={254} className="auth-input" />
          </div>
          {state.error ? <p role="alert" className="auth-notice auth-notice-error">{state.error}</p> : null}
          <SubmitButton label="Email me a reset link" pendingLabel="Sending link…" />
        </form>
      )}
      <p className="auth-under-form"><Link href="/login" className="auth-text-link">Back to sign in</Link></p>
    </div>
  );
}
