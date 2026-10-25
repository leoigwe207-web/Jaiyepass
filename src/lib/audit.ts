import "server-only";
import { createAdminClient } from "./supabase/admin";

/**
 * Append-only audit trail for sensitive actions. Uses the service role.
 * Never pass secrets or personal data in `metadata`.
 */
export async function writeAuditLog(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    // Auditing must not break the primary action, but failures are visible.
    console.error("[audit] failed to write audit log", e);
  }
}
