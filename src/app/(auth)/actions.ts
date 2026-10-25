"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, signupSchema } from "@/lib/validation";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import {
  DEMO_ACCOUNTS,
  demoModeEnabled,
  setDemoSession,
  verifyDemoCredentials,
} from "@/lib/demo";
import { supabaseConfigured } from "@/lib/queries";

export interface AuthFormState {
  error?: string;
  message?: string;
}

async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:${ip}`;
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rl = rateLimit(await clientKey("login"), RATE_LIMITS.login);
  if (!rl.ok) return { error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.` };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const next = String(formData.get("next") ?? "");
  const nextRoute = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // Preview-only demo credentials (spec §3). Reachable only when Supabase is
  // not configured AND the build is not production — never in production.
  if (demoModeEnabled()) {
    const demoRole = verifyDemoCredentials(parsed.data.email, parsed.data.password);
    if (demoRole) {
      await setDemoSession(demoRole);
      redirect(nextRoute === "/" ? DEMO_ACCOUNTS[demoRole].destination : nextRoute);
    }
  }

  // Without a database, real sign-in cannot work — say so instead of failing.
  if (!supabaseConfigured()) {
    return { error: "No database is connected on this preview — use the demo buttons or demo credentials below." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    // Deliberately generic — no account enumeration.
    return { error: "Incorrect email or password." };
  }
  redirect(nextRoute);
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rl = rateLimit(await clientKey("signup"), RATE_LIMITS.signup);
  if (!rl.ok) return { error: `Too many signups from this device. Try again in ${rl.retryAfterSeconds}s.` };

  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form fields." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${serverEnv().appUrl}/auth/callback`,
    },
  });

  if (error) {
    if (/already registered/i.test(error.message)) {
      return { error: "An account with this email already exists — try signing in." };
    }
    return { error: "Could not create the account. Try again shortly." };
  }

  // Row for profile is created by the database trigger-less path below
  // (supabase.auth triggers may not exist in every project config).
  if (data.user) {
    try {
      const admin = createAdminClient();
      await admin.from("profiles").upsert(
        {
          id: data.user.id,
          email: parsed.data.email,
          full_name: parsed.data.fullName,
          role: "attendee",
        },
        { ignoreDuplicates: true },
      );
    } catch {
      // Non-fatal: profile backfilled on first login if service role missing.
    }
  }

  return {
    message:
      "Account created. Check your inbox to confirm your email, then sign in.",
  };
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rl = rateLimit(await clientKey("reset"), RATE_LIMITS.passwordReset);
  if (!rl.ok) return { error: `Too many reset requests. Try again in ${rl.retryAfterSeconds}s.` };

  const email = String(formData.get("email") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const appUrl = serverEnv().appUrl;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: "Could not send the reset email. Try again shortly." };

  // Also log through our adapter so behaviour is visible server-side when
  // email credentials are absent (nothing is claimed as delivered).
  await sendEmail(
    passwordResetEmail({
      to: email,
      resetUrl: `${appUrl}/auth/callback?next=/reset-password`,
    }),
  );

  return {
    message: "If that address has an account, a reset link is on its way. Check your inbox and spam folder.",
  };
}
