"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_EVENT_COVER_BYTES } from "@/lib/event-cover";

export function EventCoverUploader({ eventId, initialUrl }: { eventId: string; initialUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function upload() {
    const file = input.current?.files?.[0];
    setError(""); setMessage("");
    if (!file) return setError("Choose an image first.");
    if (file.size === 0 || file.size > MAX_EVENT_COVER_BYTES) return setError("Image must be 3 MB or smaller.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Use JPG, PNG or WebP.");

    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/host/events/${eventId}/image`, {
        method: "POST", body: form, credentials: "same-origin", cache: "no-store",
      });
      const data: { error?: string; imageUrl?: string; needsReview?: boolean } = await res.json();
      if (!res.ok || !data.imageUrl) throw new Error(data.error ?? "Upload failed.");
      setUrl(data.imageUrl);
      setMessage(data.needsReview ? "Image saved. The event has returned to review before it appears publicly." : "Image saved successfully.");
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload image.");
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-card border border-line bg-white p-5" aria-label="Event cover image">
      <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-bold">Event cover artwork</h2>
      <p className="mt-1 text-sm text-ink-soft">A clear image helps your event stand out. Upload a JPG, PNG or WebP under 3 MB. We scan and convert every accepted image into a clean WebP, removing metadata before publishing.</p>
      {url ? (
        // This is an owner-controlled URL for a public event poster, not sensitive media.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Current event cover" className="mt-4 aspect-[16/9] max-h-80 w-full rounded-card border border-line object-cover" />
      ) : (
        <div className="jp-cover-empty mt-4 relative flex aspect-[16/9] max-h-72 flex-col items-center justify-center overflow-hidden rounded-card border border-line text-center text-white">
          <div aria-hidden="true" className="jp-cover-decoration" />
          <span className="relative z-10 text-[10px] font-bold uppercase tracking-[0.32em] text-white/75">Your next big moment</span>
          <span className="relative z-10 mt-3 font-[family-name:var(--font-fraunces)] text-3xl font-bold sm:text-4xl">Put your event<br />in the spotlight.</span>
          <span className="relative z-10 mt-3 max-w-[22rem] px-5 text-xs text-white/75">Your artwork appears on event listings and tickets. Make it memorable.</span>
        </div>
      )}
      <label htmlFor={`cover-${eventId}`} className="mt-5 block text-sm font-semibold">Choose your event poster</label>
      <input ref={input} id={`cover-${eventId}`} type="file" accept="image/jpeg,image/png,image/webp" className="jp-file-control mt-2 block w-full cursor-pointer rounded-card border border-line bg-paper p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-white hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon" disabled={busy} />
      <p className="mt-2 text-xs text-ink-faint">Recommended 16:9 · JPG, PNG or WebP · Max 3MB</p>
      <button onClick={upload} type="button" disabled={busy} className="mt-4 rounded-card bg-neon px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {busy ? "Uploading…" : url ? "Replace artwork" : "Upload artwork"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-ink-soft">{message}</p>}
    </section>
  );
}
