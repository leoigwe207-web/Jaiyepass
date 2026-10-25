import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { groupPlanSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Unguessable, URL-safe share code (80 bits of entropy). */
function makeShareCode(): string {
  return randomBytes(10).toString("base64url");
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a plan link." }, { status: 401 });

  const rl = rateLimit(`plan-create:${clientIp(req)}`, { limit: 10, windowMs: 10 * 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many plans created — try again later." }, { status: 429 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = groupPlanSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the plan details and try again." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", parsed.data.eventId)
    .eq("status", "published")
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const admin = createAdminClient();

  // One plan per user per event keeps share links unambiguous.
  const { data: existing } = await admin
    .from("group_plans")
    .select("id, share_code")
    .eq("owner_id", user.id)
    .eq("event_id", event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ shareCode: existing.share_code, existing: true });
  }

  const { data: plan, error } = await admin
    .from("group_plans")
    .insert({
      event_id: event.id,
      owner_id: user.id,
      title: parsed.data.title,
      note: parsed.data.note || null,
      share_code: makeShareCode(),
    })
    .select("id, share_code")
    .single();

  if (error || !plan) {
    console.error("group plan insert failed", error?.code);
    return NextResponse.json({ error: "Could not create the plan link. Try again." }, { status: 500 });
  }

  // The creator is the first member.
  const displayName = user.fullName?.trim().split(/\s+/)[0] ?? user.email.split("@")[0] ?? "Guest";
  await admin.from("group_plan_members").insert({
    plan_id: plan.id,
    user_id: user.id,
    name: displayName,
    going: true,
  });

  return NextResponse.json({ shareCode: plan.share_code });
}
