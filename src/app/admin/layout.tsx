import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: { template: "%s · Admin", default: "Admin" } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="jp-v3-dashboard-shell">
      <AdminNav />
      <div className="jp-v3-dashboard-main">
        <div className="jp-v3-dashboard-heading"><span>PLATFORM OPERATIONS / JAIYEPASS</span><Link href="/events">View website ↗</Link></div>
        {children}
        <p className="jp-v3-dashboard-audit">Administrator actions are recorded in the <Link href="/admin/audit">audit trail ↗</Link>.</p>
      </div>
    </div>
  );
}
