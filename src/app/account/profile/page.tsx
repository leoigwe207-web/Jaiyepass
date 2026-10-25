import type { Metadata } from "next";
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
    <div className="max-w-xl space-y-6">
      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">Your details</h2>
        <p className="mt-1 text-sm text-ink-faint">
          Signed in as {user.email}. We only show your first name on public attendee lists — never your email or phone
          number.
        </p>
        <ProfileForm
          initial={{
            fullName: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            notificationOptIn: profile?.notification_opt_in ?? true,
          }}
        />
      </section>

      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-bold">Password</h2>
        <p className="mt-1 text-sm text-ink-faint">
          Changing your password sends a secure link to {user.email}.
        </p>
        <form action="/auth/reset-password" className="mt-4">
          <button type="submit" className="rounded-card border border-line px-4 py-2 text-sm font-semibold hover:border-ink">
            Email me a reset link
          </button>
        </form>
      </section>
    </div>
  );
}
