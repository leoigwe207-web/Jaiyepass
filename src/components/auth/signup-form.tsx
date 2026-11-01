"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthFormState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { PasswordField } from "@/components/auth/password-field";

export function SignupForm({ hostIntent = false }: { hostIntent?: boolean }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signupAction, {});
  if (state.message) {
    return (
      <div className="auth-form-panel" role="status">
        <p className="auth-kicker">ONE MORE STEP</p>
        <h1 className="auth-title">Check your inbox.</h1>
        <p className="auth-description">{state.message}</p>
        <Link href="/login" className="auth-inline-button mt-7">Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="auth-form-panel">
      <p className="auth-kicker"><span className="auth-kicker-dot"/> YOUR NEXT EXPERIENCE STARTS HERE</p>
      <h1 className="auth-title">Make it a good one.</h1>
      <p className="auth-description">{hostIntent ? "Create one account to host events, sell tickets and manage your audience." : "One account for discovering events, getting tickets and making memories."}</p>
      <form action={formAction} className="auth-form">
        <div className="auth-field">
          <label htmlFor="fullName" className="auth-label">Full name</label>
          <input id="fullName" name="fullName" placeholder="Your full name" required autoComplete="name" minLength={2} maxLength={100} className="auth-input" />
        </div>
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" maxLength={254} className="auth-input" />
        </div>
        <PasswordField autoComplete="new-password" minLength={10} hint="At least 10 characters, including a letter and a number." />
        {state.error ? <p role="alert" className="auth-notice auth-notice-error">{state.error}</p> : null}
        <SubmitButton label="Create my account" pendingLabel="Creating account…" />
        <p className="text-xs leading-relaxed text-ink-soft">By creating an account, you agree to our <Link href="/terms" className="auth-text-link">Terms</Link> and <Link href="/privacy" className="auth-text-link">Privacy policy</Link>.</p>
      </form>
      <p className="auth-under-form">Already have an account? <Link href="/login" className="auth-text-link">Sign in</Link></p>
    </div>
  );
}
