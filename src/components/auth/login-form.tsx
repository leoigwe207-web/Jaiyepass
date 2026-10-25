"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/app/(auth)/actions";
import { demoLoginAction } from "@/app/(auth)/demo-actions";
import { SubmitButton } from "@/components/submit-button";

export interface DemoAccountOption {
  role: string;
  email: string;
  password: string;
  buttonLabel: string;
  destination: string;
}

export function LoginForm({
  next,
  notice,
  demo = false,
  demoAccounts = [],
}: {
  next: string;
  notice?: string;
  demo?: boolean;
  demoAccounts?: DemoAccountOption[];
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, {});

  return (
    <div>
      <h1 className="display-md">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Sign in to see your tickets, saved events, and plans.
      </p>

      {notice && (
        <p role="status" className="mt-4 rounded-card border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          {notice}
        </p>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
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
            autoComplete="current-password"
            maxLength={128}
            className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
          />
        </div>

        {state.error && (
          <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <SubmitButton label="Sign in" pendingLabel="Signing in…" />

        <p className="flex justify-between text-sm">
          <Link href="/reset-password" className="text-neon-deep underline underline-offset-2">
            Forgot password?
          </Link>
          <Link href="/signup" className="font-semibold underline underline-offset-2">
            Create account
          </Link>
        </p>
      </form>

      {demo && demoAccounts.length > 0 && (
        <section
          aria-labelledby="demo-heading"
          className="mt-8 rounded-card border border-dashed border-neon-deep/50 bg-neon/5 p-4 sm:p-5"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neon-deep">
            Preview demo mode
          </p>
          <h2 id="demo-heading" className="mt-1 font-[family-name:var(--font-fraunces)] text-lg font-bold">
            No database connected — look around with sample data
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Each button opens that role's demo dashboard. Everything is clearly
            labelled demo data, no real transactions exist, and demo mode is
            disabled in production builds.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {demoAccounts.map((a) => (
              <form key={a.role} action={demoLoginAction}>
                <input type="hidden" name="role" value={a.role} />
                <input type="hidden" name="next" value={a.destination} />
                <button
                  type="submit"
                  className="w-full rounded-card border border-ink bg-white px-4 py-2.5 text-sm font-bold hover:bg-ink hover:text-paper"
                >
                  {a.buttonLabel}
                </button>
              </form>
            ))}
          </div>

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-neon-deep">
              Or sign in with demo credentials
            </summary>
            <ul className="mt-2 space-y-1 text-ink-soft">
              {demoAccounts.map((a) => (
                <li key={a.role} className="break-all">
                  <code className="text-xs">{a.email}</code> · <code className="text-xs">{a.password}</code>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
