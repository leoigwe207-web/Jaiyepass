import type { Metadata } from "next";
import { requireUser, getManagedOrgId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HostNav } from "@/components/host/host-nav";

export const metadata: Metadata = { title: { template: "%s · Host", default: "Host dashboard" } };
export const dynamic = "force-dynamic";
export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/host");
  const orgId = await getManagedOrgId(user.id);
  if (!orgId && user.role !== "admin") {
    const supabase = await createClient();
    const { data: { user: signedIn } } = await supabase.auth.getUser();
    if (signedIn?.user_metadata?.account_type !== "organizer") redirect("/account/tickets");
  }
  return (
    <div className="jp-v3-dashboard-shell">
      <HostNav email={user.email} isHost={!!orgId} isPlatformAdmin={user.role === "admin"} />
      <div className="jp-v3-dashboard-main">
        <div className="jp-v3-dashboard-heading"><span>THE ORGANIZER STUDIO / JAIYEPASS</span><a href="/events">Explore events ↗</a></div>
        {children}
      </div>
    </div>
  );
}
