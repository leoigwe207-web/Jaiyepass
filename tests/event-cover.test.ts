import { describe, expect, it } from "vitest";
import { detectEventCover, MAX_EVENT_COVER_BYTES, ownedEventCoverPath } from "../src/lib/event-cover";

const jpeg = Uint8Array.from([255,216,255,0,0,0,0,0,0,0,0,0]);
const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
const webp = Uint8Array.from([82,73,70,70,0,0,0,0,87,69,66,80]);

describe("event cover validation", () => {
  it("accepts genuine JPEG files", () => expect(detectEventCover(jpeg, "image/jpeg")?.extension).toBe("jpg"));
  it("accepts genuine PNG files", () => expect(detectEventCover(png, "image/png")?.extension).toBe("png"));
  it("accepts genuine WebP files", () => expect(detectEventCover(webp, "image/webp")?.extension).toBe("webp"));
  it("rejects a spoofed MIME type", () => expect(detectEventCover(png, "image/jpeg")).toBeNull());
  it("rejects SVG", () => expect(detectEventCover(new TextEncoder().encode('<svg>test</svg>'), "image/svg+xml")).toBeNull());
  it("rejects empty or oversized files", () => {
    expect(detectEventCover(new Uint8Array(), "image/png")).toBeNull();
    expect(detectEventCover(new Uint8Array(MAX_EVENT_COVER_BYTES+1), "image/png")).toBeNull();
  });
  it("deletes only paths inside the same event's bucket", () => {
    const host = "https://example.supabase.co";
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const name = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp";
    const url = `${host}/storage/v1/object/public/event-images/events/${id}/${name}`;
    expect(ownedEventCoverPath(url, host, id)).toBe(`events/${id}/${name}`);
    expect(ownedEventCoverPath(url, host, "cccccccc-cccc-4ccc-8ccc-cccccccccccc")).toBeNull();
    expect(ownedEventCoverPath(url.replace(host, "https://evil.com"), host, id)).toBeNull();
  });
});
