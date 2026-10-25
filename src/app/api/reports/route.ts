import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { reportSchema } from "@/lib/validation";
import { rateLimit, clientIp, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to report an event." }, { status: 401 });

  const rl = rateLimit(`report:${clientIp(req)}`, RATE_LIMITS.report);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many reports — try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the report details and try again." }, { status: 400 });
  }

  const supabase = await createClient();

  // The event must exist and be visible (RLS: published or org-visible).
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", parsed.data.eventId)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const { error } = await supabase.from("event_reports").insert({
    event_id: parsed.data.eventId,
    reporter_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });

  if (error) {
    console.error("report insert failed", error.code);
    return NextResponse.json({ error: "Could not send the report. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
