import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function findEventId(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data?.id ?? null;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ saved: false }, { status: 401 });

  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const eventId = await findEventId(slug);
  if (!eventId) return NextResponse.json({ saved: false });

  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle();

  return NextResponse.json({ saved: !!data });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to save events." }, { status: 401 });

  const rl = rateLimit(`saved:${clientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: { slug?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug.slice(0, 120) : "";
  const eventId = await findEventId(slug);
  if (!eventId) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_events")
    .insert({ user_id: user.id, event_id: eventId });

  // 23505 = already saved; treat as success.
  if (error && error.code !== "23505") {
    console.error("saved insert failed", error.code);
    return NextResponse.json({ error: "Could not save this event." }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const eventId = await findEventId(slug);
  if (!eventId) return NextResponse.json({ saved: false });

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_events")
    .delete()
    .eq("user_id", user.id)
    .eq("event_id", eventId);

  if (error) {
    console.error("saved delete failed", error.code);
    return NextResponse.json({ error: "Could not update saved events." }, { status: 500 });
  }
  return NextResponse.json({ saved: false });
}
