import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseConfigured } from "./queries";

/**
 * Preview-only demo mode (spec §3).
 *
 * Demo mode exists so the product is previewable BEFORE Supabase or Paystack
 * credentials are available. It is fail-closed:
 *   - only active when Supabase is NOT configured, and
 *   - disabled outright in production builds (NODE_ENV === "production").
 * Demo sessions are HMAC-signed cookies scoped to this mode; they grant no
 * access once a database is connected or the app is built for production.
 * Nothing a demo session does is written to the database.
 */

export type DemoRole = "attendee" | "host" | "scanner" | "admin";

export const DEMO_COOKIE = "jaiyepass_demo_session";
const DEMO_SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours
// Fallback signing secret. Only reachable while no database is configured;
// TICKET_TOKEN_PEPPER takes precedence when set.
const DEV_FALLBACK_SECRET = "jaiyepass-preview-demo-v1";

export interface DemoAccount {
  email: string;
  password: string;
  /** Display name shown in dashboards. */
  label: string;
  /** Route the "Try as …" button opens. */
  destination: string;
  /** What the button calls the role. */
  buttonLabel: string;
}

export const DEMO_ACCOUNTS: Record<DemoRole, DemoAccount> = {
  attendee: {
    email: "attendee@jaiyepass.demo",
    password: "JaiyeDemo123!",
    label: "Demo Attendee",
    destination: "/account/tickets",
    buttonLabel: "Try as Attendee",
  },
  host: {
    email: "host@jaiyepass.demo",
    password: "JaiyeDemo123!",
    label: "Demo Host",
    destination: "/host",
    buttonLabel: "Try as Host",
  },
  scanner: {
    email: "scanner@jaiyepass.demo",
    password: "JaiyeDemo123!",
    label: "Demo Scanner",
    destination: "/scan",
    buttonLabel: "Try as Scanner",
  },
  admin: {
    email: "admin@jaiyepass.demo",
    password: "JaiyeDemo123!",
    label: "Demo Admin",
    destination: "/admin",
    buttonLabel: "Try as Admin",
  },
};

const DEMO_ROLES = ["attendee", "host", "scanner", "admin"] as const;

/** Pure gate — separated so tests can assert the fail-closed rules directly. */
export function isDemoModeAllowed(configured: boolean, nodeEnv: string): boolean {
  return !configured && nodeEnv !== "production";
}

/** Demo mode is on only without a database and outside production builds. */
export function demoModeEnabled(): boolean {
  return isDemoModeAllowed(supabaseConfigured(), process.env.NODE_ENV);
}

function signingSecret(): string {
  return process.env.TICKET_TOKEN_PEPPER || DEV_FALLBACK_SECRET;
}

function hmac(value: string): string {
  return createHmac("sha256", signingSecret()).update(value).digest("hex");
}

/** Build a signed session token for a demo role. Pure — testable. */
export function signDemoToken(role: DemoRole, expiresAt: number): string {
  const payload = `${role}.${expiresAt}`;
  return `${payload}.${hmac(payload)}`;
}

/**
 * Verify a session token: signature, shape, role allowlist and expiry.
 * Returns the role, or null for anything invalid. Pure — testable.
 */
export function verifyDemoToken(token: string | undefined, now = Date.now()): DemoRole | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [role, expRaw, sig] = parts as [string, string, string];
  if (!(DEMO_ROLES as readonly string[]).includes(role)) return null;

  const expected = hmac(`${role}.${expRaw}`);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || now > exp) return null;
  return role as DemoRole;
}

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    // Still burn a comparison so length differences are not a timing oracle.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/**
 * Match the preview-only demo credentials from the spec. Checked against every
 * account so the email typed does not leak which one exists. Only reachable
 * when demoModeEnabled() is true (the caller checks first).
 */
export function verifyDemoCredentials(email: string, password: string): DemoRole | null {
  let match: DemoRole | null = null;
  for (const role of DEMO_ROLES) {
    const account = DEMO_ACCOUNTS[role];
    const ok =
      constantTimeEquals(account.email.toLowerCase(), email.toLowerCase()) &&
      constantTimeEquals(account.password, password);
    if (ok) match = role;
  }
  return match;
}

export interface DemoUser {
  role: DemoRole;
  email: string;
  label: string;
}

/** Read and verify the demo session cookie, or null. Fail-closed. */
export async function getDemoUser(): Promise<DemoUser | null> {
  if (!demoModeEnabled()) return null;
  // Outside a request scope (tests, scripts) there is no cookie jar; fail closed.
  let token: string | undefined;
  try {
    token = (await cookies()).get(DEMO_COOKIE)?.value;
  } catch {
    return null;
  }
  const role = verifyDemoToken(token);
  if (!role) return null;
  const account = DEMO_ACCOUNTS[role];
  return { role, email: account.email, label: account.label };
}

/** Set the demo session cookie (server action / route handler only). */
export async function setDemoSession(role: DemoRole): Promise<void> {
  const jar = await cookies();
  jar.set(DEMO_COOKIE, signDemoToken(role, Date.now() + DEMO_SESSION_TTL_SECONDS * 1000), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_SESSION_TTL_SECONDS,
  });
}

/** Clear the demo session cookie. */
export async function clearDemoSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
}
