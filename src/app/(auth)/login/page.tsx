import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { demoModeEnabled, DEMO_ACCOUNTS } from "@/lib/demo";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/";
  // Demo panel only renders while demo mode is allowed (no DB, not production).
  const demo = demoModeEnabled();
  const demoAccounts = demo
    ? (Object.entries(DEMO_ACCOUNTS) as [
        string,
        { email: string; password: string; buttonLabel: string; destination: string },
      ][]).map(([role, a]) => ({
        role,
        email: a.email,
        password: a.password,
        buttonLabel: a.buttonLabel,
        destination: a.destination,
      }))
    : [];
  return <LoginForm next={next} notice={sp.message} demo={demo} demoAccounts={demoAccounts} />;
}
