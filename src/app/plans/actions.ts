"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const joinSchema = z.object({ planId: z.string().uuid() });

/**
 * Join a group plan. Uses the service role: RLS would otherwise hide the
 * plan row from a first-time joiner (the share link already proves intent),
 * and the join/leave itself is scoped to the caller's own user id.
 */
export async function joinPlanAction(planId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();

  const rl = rateLimit(`plan-join:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return { ok: false, error: "Too many attempts — wait a minute." };
  }

  const parsed = joinSchema.safeParse({ planId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid plan." };
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("group_plans")
    .select("id, title")
    .eq("id", parsed.data.planId)
    .maybeSingle();

  if (!plan) {
    return { ok: false, error: "Plan not found." };
  }

  const displayName =
    user.fullName?.trim().split(/\s+/)[0] ?? user.email.split("@")[0] ?? "Guest";

  // Plain insert: the partial unique index (plan_id, user_id) where user_id
  // is not null cannot be targeted by PostgREST upsert inference, so treat
  // a duplicate as "already joined".
  const { error } = await admin.from("group_plan_members").insert({
    plan_id: plan.id,
    user_id: user.id,
    name: displayName,
    going: true,
  });

  if (error && error.code !== "23505") {
    console.error("plan join failed", error.code);
    return { ok: false, error: "Could not join the plan. Try again." };
  }

  revalidatePath("/account/plans");
  return { ok: true };
}

export async function leavePlanAction(planId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = joinSchema.safeParse({ planId });
  if (!parsed.success) return { ok: false, error: "Invalid plan." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("group_plan_members")
    .delete()
    .eq("plan_id", parsed.data.planId)
    .eq("user_id", user.id);

  if (error) {
    console.error("plan leave failed", error.code);
    return { ok: false, error: "Could not leave the plan." };
  }

  revalidatePath("/account/plans");
  return { ok: true };
}
