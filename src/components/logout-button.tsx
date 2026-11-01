"use client";

import { useRouter } from "next/navigation";
import { forgetAttendee } from "@/lib/analytics/events";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    forgetAttendee();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-card border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
    >
      Sign out
    </button>
  );
}
