import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { FieldDecisionForm } from "@/components/admin/admin-forms";
import { setOrgVerificationAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Organizers" };

const VERIFY_LABELS: Record<string, { label: string; cls: string }> = {
  unverified: { label: "Unverified", cls: "bg-paper-dim text-ink-soft border-line" },
  pending: { label: "Pending", cls: "bg-warning/10 text-warning border-warning/30" },
  verified: { label: "Verified", cls: "bg-success/10 text-success border-success/30" },
  rejected: { label: "Rejected", cls: "bg-danger/10 text-danger border-danger/30" },
};

export default async function AdminHostsPage() {
  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from("organizations")
    .select(
      `id, name, slug, verification, verification_note, contact_email, contact_phone, created_at,
       organization_members(count),
       events(count)`,
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">Organizers</h1>
        <p className="mt-1 text-sm text-ink-soft">{orgs?.length ?? 0} organizer accounts</p>
      </section>

      {(!orgs || orgs.length === 0) ? (
        <p className="text-sm text-ink-faint">No organizer accounts yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-white">
          {orgs.map((o) => {
            const status = VERIFY_LABELS[o.verification] ?? VERIFY_LABELS.unverified!;
            const memberCount = (o.organization_members as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
            const eventCount = (o.events as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <li key={o.id} className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-[family-name:var(--font-fraunces)] text-lg font-bold">{o.name}</p>
                    <span className={`rounded-card border px-2 py-0.5 text-xs font-bold ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">
                    {o.contact_email}
                    {o.contact_phone ? ` · ${o.contact_phone}` : ""} · joined {formatDateTime(o.created_at)} ·{" "}
                    {memberCount} member{memberCount === 1 ? "" : "s"} · {eventCount} event
                    {eventCount === 1 ? "" : "s"}
                  </p>
                  {o.verification_note && <p className="mt-1 text-xs text-ink-soft">Note: {o.verification_note}</p>}
                </div>
                <div className="max-w-md">
                  <FieldDecisionForm
                    action={setOrgVerificationAction}
                    fields={{ orgId: o.id }}
                    options={[
                      { name: "decision", value: "verified", label: "Verify", tone: "primary" },
                      { name: "decision", value: "rejected", label: "Reject", tone: "danger" },
                      { name: "decision", value: "pending", label: "Reset to pending" },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
