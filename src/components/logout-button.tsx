"use client";

import { useRouter } from "next/navigation";
import { demoLogoutAction } from "@/app/(auth)/demo-actions";

export function LogoutButton({ demo = false }: { demo?: boolean }) {
  const router = useRouter();

  // Preview demo sessions clear the demo cookie — no Supabase involved.
  if (demo) {
    return (
      <form action={demoLogoutAction}>
        <button
          type="submit"
          className="rounded-card border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
        >
          Sign out of demo
        </button>
      </form>
    );
  }

  async function logout() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
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
