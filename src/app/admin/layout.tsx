import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: { template: "%s · Admin", default: "Admin" } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl">
      <AdminNav />
      <div className="mt-6">{children}</div>
      <p className="mt-10 text-xs text-ink-faint">
        Administrative actions are logged in the{" "}
        <Link href="/admin/audit" className="underline underline-offset-2">
          audit trail
        </Link>
        .
      </p>
    </div>
  );
}
