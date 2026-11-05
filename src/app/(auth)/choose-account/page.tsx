import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, getManagedOrgId } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose your account" };
export const dynamic = "force-dynamic";

export default async function ChooseAccountPage() {
  const user = await getSessionUser();
  if (user) {
    if (user.role === "admin") redirect("/admin");
    if (await getManagedOrgId(user.id)) redirect("/host");
    // An organizer can finish organization setup after signing in.
    const { createClient } = await import("@/lib/supabase/server");
    const client = await createClient();
    const { data: { user: authUser } } = await client.auth.getUser();
    redirect(authUser?.user_metadata?.account_type === "organizer" ? "/host" : "/account");
  }
  return (
    <div className="auth-form-panel">
      <p className="auth-kicker"><span className="auth-kicker-dot" /> WELCOME TO JAIYEPASS</p>
      <h1 className="auth-title">How will you use JaiyePass?</h1>
      <p className="auth-description">Choose your account type to get the right sign-in and dashboard experience.</p>
      <div className="mt-8 grid gap-4">
        <Link href="/login?role=individual" className="block rounded-card border border-line bg-white p-5 transition hover:border-neon-deep">
          <span className="block text-xl font-bold">Individual</span>
          <span className="mt-1 block text-sm text-ink-soft">Discover events, buy tickets, and manage bookings.</span>
          <span className="mt-3 block text-sm font-semibold text-neon-deep">Continue as an individual →</span>
        </Link>
        <Link href="/login?role=organizer" className="block rounded-card border border-line bg-white p-5 transition hover:border-neon-deep">
          <span className="block text-xl font-bold">Organizer</span>
          <span className="mt-1 block text-sm text-ink-soft">Create events, manage attendees, and monitor ticket sales.</span>
          <span className="mt-3 block text-sm font-semibold text-neon-deep">Continue as an organizer →</span>
        </Link>
      </div>
      <p className="auth-under-form">Just browsing? <Link href="/events" className="auth-text-link">Explore events without signing in</Link></p>
    </div>
  );
}
