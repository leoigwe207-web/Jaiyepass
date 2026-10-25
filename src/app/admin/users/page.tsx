import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { FieldDecisionForm } from "@/components/admin/admin-forms";
import { setUserRoleAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const { data: users } = await admin
    .from("profiles")
    .select(
      `id, email, full_name, role, city, created_at,
       orders(count),
       organization_members(organization_id, organizations(name))`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Users</h1>
        <p className="mt-1 text-sm text-ink-soft">{users?.length ?? 0} accounts (latest 200)</p>
      </section>

      {(!users || users.length === 0) ? (
        <p className="text-sm text-ink-faint">No user accounts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.1em] text-ink-faint">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Organizer</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => {
                const orgs = (u.organization_members ?? []) as unknown as {
                  organization_id: string;
                  organizations: { name: string } | null;
                }[];
                const orderCount = (u.orders as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{u.full_name ?? "—"}</span>
                      <span className="block text-xs text-ink-faint">{u.email}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {orgs.length ? orgs.map((o) => o.organizations?.name ?? "—").join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">{orderCount}</td>
                    <td className="px-4 py-3 text-xs text-ink-faint">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <FieldDecisionForm
                        action={setUserRoleAction}
                        fields={{ userId: u.id }}
                        options={
                          u.role === "admin"
                            ? [{ name: "role", value: "attendee", label: "Demote to attendee", tone: "danger" }]
                            : [{ name: "role", value: "admin", label: "Make admin", tone: "primary" }]
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
