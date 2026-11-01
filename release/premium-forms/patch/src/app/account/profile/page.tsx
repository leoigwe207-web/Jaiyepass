import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, notification_opt_in, created_at")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="jp-editor-panel p-6 sm:p-9">
        <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-bold tracking-tight">Your details</h2>
        <p className="mt-1 text-sm text-ink-faint">
          Manage the details event organizers may need. Your contact details stay private.
          <span className="mt-2 block text-xs text-ink-faint">Signed in as {user.email}</span>
        </p>
        <ProfileForm
          initial={{
            fullName: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            notificationOptIn: profile?.notification_opt_in ?? true,
          }}
        />
      </section>

      <section className="jp-editor-panel p-6 sm:p-9">
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-bold">Password</h2>
        <p className="mt-1 text-sm text-ink-faint">
          Changing your password sends a secure link to {user.email}.
        </p>
        <Link href="/reset-password" className="mt-5 inline-flex min-h-11 items-center border border-ink px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white">
          Manage password
        </Link>
      </section>
    </div>
  );
}
