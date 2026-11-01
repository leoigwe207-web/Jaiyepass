/** Utilities for public event artwork; never accept SVG or arbitrary client MIME claims. */
export const MAX_EVENT_COVER_BYTES = 3 * 1024 * 1024;
export const EVENT_COVER_BUCKET = "event-images";

export type CoverKind = { contentType: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" };

/** Verify actual bytes and the claimed content type agree. */
export function detectEventCover(bytes: Uint8Array, claimedType: string): CoverKind | null {
  if (bytes.length < 12 || bytes.length > MAX_EVENT_COVER_BYTES) return null;
  const at = (i: number) => bytes[i];
  if (claimedType === "image/jpeg" && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (claimedType === "image/png" &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => at(i) === v)) {
    return { contentType: "image/png", extension: "png" };
  }
  if (claimedType === "image/webp" &&
      [82, 73, 70, 70].every((v, i) => at(i) === v) &&
      [87, 69, 66, 80].every((v, i) => at(i + 8) === v)) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

/** Returns only a path in this event's owned upload directory, never an arbitrary storage path. */
export function ownedEventCoverPath(publicUrl: string, supabaseUrl: string, eventId: string): string | null {
  const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${EVENT_COVER_BUCKET}/events/${eventId}/`;
  if (!publicUrl.startsWith(prefix)) return null;
  const filename = publicUrl.slice(prefix.length);
  return /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename) ? `events/${eventId}/${filename}` : null;
}
