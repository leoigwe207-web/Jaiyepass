"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthFormState } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";

export function SignupForm({ hostIntent = false }: { hostIntent?: boolean }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signupAction, {});

  if (state.message) {
    return (
      <div role="status" className="rounded-card border border-success/30 bg-success/5 p-5">
        <p className="font-semibold text-success">Check your inbox</p>
        <p className="mt-1 text-sm text-ink-soft">{state.message}</p>
        <Link href="/login" className="mt-3 inline-block text-sm font-semibold text-neon-deep underline underline-offset-2">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="display-md">Create your account</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {hostIntent
          ? "One account for buying tickets and running your events."
          : "Buy tickets, save events, and plan with friends."}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-semibold">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            autoComplete="name"
            minLength={2}
            maxLength={100}
            className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
          />
        </div>
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
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            aria-describedby="password-hint"
            className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
          />
          <p id="password-hint" className="mt-1 text-xs text-ink-faint">
            At least 10 characters, including a letter and a number.
          </p>
        </div>

        {state.error && (
          <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <SubmitButton label="Create account" pendingLabel="Creating…" />

        <p className="text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold underline underline-offset-2">
            Sign in
          </Link>
        </p>
        <p className="text-xs text-ink-faint">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy policy</Link>.
        </p>
      </form>
    </div>
  );
}
