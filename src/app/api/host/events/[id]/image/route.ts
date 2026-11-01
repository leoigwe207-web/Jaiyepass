import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { getSessionUser, getOrgMembership } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { detectEventCover, MAX_EVENT_COVER_BYTES, EVENT_COVER_BUCKET, ownedEventCoverPath } from "@/lib/event-cover";

export const runtime = "nodejs";

function reply(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Only same-origin browser forms can mutate images. Never accept requests from a foreign Origin.
  const origin = req.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== req.nextUrl.origin) return reply("Invalid upload origin.", 403);
  } catch {
    return reply("Invalid upload origin.", 403);
  }

  const user = await getSessionUser();
  // Reject unauthenticated visitors and malformed identities.
  if (!user || !uuidSchema.safeParse(user.id).success) return reply("Sign in to upload event artwork.", 401);

  const { id: eventId } = await params;
  if (!uuidSchema.safeParse(eventId).success) return reply("Invalid event.", 400);

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, organization_id, slug, status, is_demo, image_url")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || event.is_demo) return reply("Event not found.", 404);

  const role = await getOrgMembership(user.id, event.organization_id);
  if (!role || !["owner", "admin", "manager"].includes(role)) return reply("Not allowed to edit this event.", 403);
  if (!["draft", "rejected", "pending_review", "approved", "published"].includes(event.status)) {
    return reply("This event cannot be edited.", 409);
  }

  const limit = rateLimit(`event-cover:${user.id}:${eventId}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return reply("Too many uploads. Try again later.", 429);

  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_EVENT_COVER_BYTES + 32_768) {
    return reply("Artwork must be 3 MB or smaller.", 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return reply("Invalid file upload.", 400);
  }
  const candidate = form.get("file");
  if (!(candidate instanceof File)) return reply("Choose an image file.", 400);
  if (candidate.size === 0 || candidate.size > MAX_EVENT_COVER_BYTES) return reply("Artwork must be 3 MB or smaller.", 413);

  const bytes = new Uint8Array(await candidate.arrayBuffer());
  const kind = detectEventCover(bytes, candidate.type);
  if (!kind) return reply("Only genuine JPEG, PNG and WebP images are allowed.", 415);

  // Never put visitor-supplied bytes on a public CDN. Full decode, enforce a
  // 16-million-pixel input limit, strip metadata and re-encode to ONE format.
  // SVG, GIF, TIFF, animated files and polyglots are never stored as uploaded.
  let normalized: Buffer;
  try {
    normalized = await sharp(bytes, { limitInputPixels: 16_000_000, failOn: "error", animated: false })
      .rotate() // respect EXIF before stripping it
      .resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    if (normalized.byteLength > MAX_EVENT_COVER_BYTES) return reply("Image is too large after processing.", 413);
  } catch {
    return reply("The image is corrupt, unsafe or too large to process.", 415);
  }

  const path = `events/${eventId}/${randomUUID()}.webp`;
  const { error: storageError } = await admin.storage.from(EVENT_COVER_BUCKET).upload(path, normalized, {
    cacheControl: "31536000", contentType: "image/webp", upsert: false,
  });
  if (storageError) {
    console.error("event cover upload failed", storageError.message);
    return reply("Image upload failed. Check Storage bucket configuration.", 503);
  }

  const { data: urlData } = admin.storage.from(EVENT_COVER_BUCKET).getPublicUrl(path);
  const imageUrl = urlData.publicUrl;
  const needsReview = ["approved", "published"].includes(event.status);
  const nextStatus = needsReview ? "pending_review" : event.status;
  const { error: updateError } = await admin.from("events")
    .update({ image_url: imageUrl, status: nextStatus })
    .eq("id", eventId)
    .eq("organization_id", event.organization_id);
  if (updateError) {
    await admin.storage.from(EVENT_COVER_BUCKET).remove([path]);
    console.error("event cover event update failed", updateError.code);
    return reply("Could not attach image to event. Please retry.", 503);
  }

  const previous = event.image_url && ownedEventCoverPath(event.image_url, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", eventId);
  if (previous && previous !== path) {
    const { error: cleanupError } = await admin.storage.from(EVENT_COVER_BUCKET).remove([previous]);
    if (cleanupError) console.warn("previous cover cleanup failed", cleanupError.message);
  }

  try {
    await writeAuditLog({ actorId: user.id, action: "event.cover_uploaded", entityType: "event", entityId: eventId,
      metadata: { fileType: "image/webp", originalType: kind.contentType, bytes: normalized.byteLength, previousStatus: event.status } });
  } catch { console.warn("event cover audit log failed"); }

  revalidatePath(`/host/events/${eventId}`);
  revalidatePath(`/host/events/${eventId}/edit`);
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/events");
  revalidatePath("/");
  return NextResponse.json({ imageUrl, needsReview }, { headers: { "Cache-Control": "no-store" } });
}
