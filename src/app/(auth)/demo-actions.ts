"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  DEMO_ACCOUNTS,
  demoModeEnabled,
  getDemoUser,
  setDemoSession,
  clearDemoSession,
  type DemoRole,
} from "@/lib/demo";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Preview-only demo session actions (spec §3).
 * Both actions fail closed: with a database configured, or in a production
 * build, they refuse and never set a session cookie.
 */

const ROLES = ["attendee", "host", "scanner", "admin"] as const;

async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:${ip}`;
}

/** "Try as Attendee/Host/Scanner/Admin" button on the preview login screen. */
export async function demoLoginAction(formData: FormData): Promise<void> {
  const rl = rateLimit(await clientKey("demo-login"), RATE_LIMITS.login);
  if (!rl.ok) redirect(`/login?message=${encodeURIComponent(`Too many attempts. Try again in ${rl.retryAfterSeconds}s.`)}`);

  if (!demoModeEnabled()) {
    redirect("/login?message=Demo mode is unavailable here. Connect Supabase to sign in.");
  }

  const role = String(formData.get("role") ?? "") as DemoRole;
  const destination = (formData.get("next") as string | null) || "";
  if (!(ROLES as readonly string[]).includes(role)) {
    redirect("/login?message=Unknown demo role.");
  }

  await setDemoSession(role);
  redirect(destination.startsWith("/") && !destination.startsWith("//") ? destination : DEMO_ACCOUNTS[role].destination);
}

/** Sign out of the demo session (shown on every demo dashboard). */
export async function demoLogoutAction(): Promise<void> {
  await clearDemoSession();
  redirect("/login?message=Signed out of demo mode.");
}
