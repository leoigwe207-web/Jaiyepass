import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getManagedOrgId } from "@/lib/auth";
import { getDemoUser } from "@/lib/demo";
import { HostNav } from "@/components/host/host-nav";

export const metadata: Metadata = { title: { template: "%s · Host", default: "Host dashboard" } };
export const dynamic = "force-dynamic";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const demo = await getDemoUser();
  const user = await requireUser();
  const orgId = await getManagedOrgId(user.id);

  return (
    <div className="mx-auto max-w-6xl">
      <HostNav email={user.email} isHost={!!orgId} demo={!!demo} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
