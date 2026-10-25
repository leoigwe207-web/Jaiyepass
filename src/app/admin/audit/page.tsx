import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditPage() {
  const admin = createAdminClient();
  const { data: entries } = await admin
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at, actor:profiles(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Audit log</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Append-only record of sensitive actions. Latest 200 entries.
        </p>
      </section>

      {(!entries || entries.length === 0) ? (
        <p className="text-sm text-ink-faint">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.1em] text-ink-faint">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => {
                const actor = e.actor as unknown as { email: string } | null;
                const meta = e.metadata as Record<string, unknown> | null;
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-faint">{formatDateTime(e.created_at)}</td>
                    <td className="px-4 py-3 text-xs">{actor?.email ?? "system"}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{e.action}</td>
                    <td className="px-4 py-3 text-xs">
                      {e.entity_type}
                      {e.entity_id ? ` · ${e.entity_id.slice(0, 8)}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-faint">
                      {meta && Object.keys(meta).length > 0 ? JSON.stringify(meta) : "—"}
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
