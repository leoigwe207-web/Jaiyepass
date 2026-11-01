"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { PasswordField } from "@/components/auth/password-field";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, {});

  return (
    <div className="auth-form-panel">
      <p className="auth-kicker"><span className="auth-kicker-dot"/> YOUR JAIYEPASS ACCOUNT</p>
      <h1 className="auth-title">Good to have you back.</h1>
      <p className="auth-description">Sign in to manage your tickets, discover events and keep the good times going.</p>

      {notice ? <p role="status" className="auth-notice auth-notice-success">{notice}</p> : null}
      <form action={formAction} className="auth-form">
        <input type="hidden" name="next" value={next} />
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" maxLength={254} className="auth-input" />
        </div>
        <PasswordField />
        <div className="flex justify-end">
          <Link href="/reset-password" className="auth-text-link text-sm">Forgot password?</Link>
        </div>
        {state.error ? <p role="alert" className="auth-notice auth-notice-error">{state.error}</p> : null}
        <SubmitButton label="Sign in securely" pendingLabel="Signing in…" />
      </form>
      <p className="auth-under-form">New to JaiyePass? <Link href="/signup" className="auth-text-link">Create an account</Link></p>
    </div>
  );
}
