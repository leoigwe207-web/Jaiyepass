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
    const { createClient } = await import("@/lib/supabase/server");
    const client = await createClient();
    const { data: { user: authUser } } = await client.auth.getUser();
    redirect(authUser?.user_metadata?.account_type === "organizer" ? "/host" : "/account");
  }
  return (
    <div className="jp-signup-form">
      <p className="text-sm font-semibold text-neon-deep">WELCOME BACK</p>
      <h1 className="jp-screen-heading">How do you use JaiyePass?</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">Select an account to open the right sign-in page and dashboard.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/login?role=individual" className="jp-account-choice group">
          <span className="jp-account-symbol" aria-hidden="true">◯</span>
          <span className="text-xl font-bold">Individual</span>
          <span className="text-sm leading-relaxed text-ink-soft">Manage tickets, orders, saved events and your plans.</span>
          <span className="text-sm font-bold text-neon-deep">Continue to sign in →</span>
        </Link>
        <Link href="/login?role=organizer" className="jp-account-choice group">
          <span className="jp-account-symbol" aria-hidden="true">▣</span>
          <span className="text-xl font-bold">Organizer</span>
          <span className="text-sm leading-relaxed text-ink-soft">Manage event listings, ticket sales and check-in.</span>
          <span className="text-sm font-bold text-neon-deep">Continue to sign in →</span>
        </Link>
      </div>
      <p className="mt-8 text-center text-sm text-ink-soft">New here? <Link className="auth-text-link" href="/signup">Create an account</Link></p>
      <p className="mt-4 text-center text-sm text-ink-soft"><Link className="auth-text-link" href="/events">Browse without signing in</Link></p>
    </div>
  );
}
