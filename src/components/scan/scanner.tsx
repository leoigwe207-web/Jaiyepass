"use client";

import { useEffect, useRef, useState } from "react";

export interface ScanEventOption {
  id: string;
  title: string;
}

type ScanOutcome = {
  result: string;
  message: string;
  ticket?: { ticketType: string; attendeeName: string; usedAt: string | null } | null;
};

const RESULT_STYLES: Record<string, string> = {
  valid: "border-success bg-success/10 text-success",
  already_used: "border-warning bg-warning/10 text-warning",
  wrong_event: "border-danger bg-danger/10 text-danger",
  cancelled: "border-danger bg-danger/10 text-danger",
  refunded: "border-danger bg-danger/10 text-danger",
  invalid: "border-danger bg-danger/10 text-danger",
};

export function Scanner({
  events,
  initialEventId,
  canUseCamera,
}: {
  events: ScanEventOption[];
  initialEventId: string | null;
  canUseCamera: boolean;
}) {
  const [eventId, setEventId] = useState(initialEventId ?? events[0]?.id ?? "");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScanned = useRef<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);

  const currentTitle = events.find((e) => e.id === eventId)?.title ?? "";

  async function submitScan(payload: string) {
    const clean = payload.trim();
    if (!clean || !eventId || busy) return;
    // Debounce identical codes for 3s (the camera loop fires repeatedly).
    if (lastScanned.current === clean) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: clean, eventId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setError("Session expired — sign in again to scan.");
      } else if (res.status === 403) {
        setError(json.error ?? "Not allowed for this event.");
      } else if (res.status === 429) {
        setError(json.error ?? "Too many scans — pause a moment.");
      } else if (!res.ok) {
        setError(json.error ?? "Scan failed — try again.");
      } else {
        setOutcome(json as ScanOutcome);
        if ("vibrate" in navigator) navigator.vibrate(json.result === "valid" ? 120 : [80, 60, 80]);
      }
    } catch {
      setError("Network error — check your connection and scan again.");
    }
    setBusy(false);
    lastScanned.current = clean;
    window.setTimeout(() => {
      if (lastScanned.current === clean) lastScanned.current = "";
    }, 3000);
  }

  function stopCamera() {
    if (loopRef.current) window.clearInterval(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setCameraError(null);
    if (!("BarcodeDetector" in window)) {
      setCameraError("This browser can't scan camera codes — paste the QR value below instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraOn(true);

      const detector = new (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> } }).BarcodeDetector({
        formats: ["qr_code"],
      });
      loopRef.current = window.setInterval(async () => {
        if (!videoRef.current || busy) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (value) void submitScan(value);
        } catch {
          /* transient detect failure */
        }
      }, 700);
    } catch {
      setCameraError("Camera permission denied — use manual entry below.");
      stopCamera();
    }
  }

  useEffect(() => () => stopCamera(), []);

  if (events.length === 0) {
    return (
      <p className="rounded-card border border-line bg-white p-6 text-sm text-ink-soft">
        You haven&apos;t been assigned to any events yet. Ask the organizer to add you as a scanner for their event.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="scan-event" className="mb-1 block text-sm font-semibold">
          Scanning for
        </label>
        <select
          id="scan-event"
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            setOutcome(null);
          }}
          className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      <div
        role="status"
        aria-live="assertive"
        className={`rounded-card border p-6 text-center ${
          outcome ? RESULT_STYLES[outcome.result] ?? "border-line bg-white" : "border-line bg-white"
        }`}
      >
        {outcome ? (
          <>
            <p className="font-[family-name:var(--font-fraunces)] text-3xl font-extrabold">
              {outcome.result === "valid" ? "✓ ALLOWED IN" : "✕ NOT VALID"}
            </p>
            <p className="mt-1 text-sm font-semibold">{outcome.message}</p>
            {outcome.ticket && (
              <p className="mt-1 text-sm">
                {outcome.ticket.attendeeName} · {outcome.ticket.ticketType}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-faint">
            Scan a ticket QR code, or paste the code value below. You&apos;re scanning for{" "}
            <span className="font-semibold text-ink">{currentTitle}</span>.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <video
        ref={videoRef}
        muted
        playsInline
        className={`w-full rounded-card bg-night ${cameraOn ? "block" : "hidden"}`}
        style={{ aspectRatio: "4 / 3", objectFit: "cover" }}
      />
      {cameraError && <p className="text-sm text-danger">{cameraError}</p>}

      <div className="flex flex-wrap gap-3">
        {canUseCamera &&
          (cameraOn ? (
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-card border border-line px-4 py-2.5 text-sm font-semibold hover:border-ink"
            >
              Stop camera
            </button>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="rounded-card bg-ink px-4 py-2.5 text-sm font-bold text-paper hover:bg-night"
            >
              Start camera
            </button>
          ))}

        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitScan(manual);
            setManual("");
          }}
        >
          <label htmlFor="scan-manual" className="sr-only">
            Ticket code
          </label>
          <input
            id="scan-manual"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Paste ticket code…"
            autoComplete="off"
            className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={busy || manual.trim().length < 10}
            className="rounded-card bg-neon px-4 py-2.5 text-sm font-bold text-white hover:bg-neon-deep disabled:opacity-60"
          >
            Check
          </button>
        </form>
      </div>

      <p className="text-xs text-ink-faint">
        Tip: every attempt is recorded on the event&apos;s check-in log, including rejections. When in doubt, ask for ID
        and the original order receipt.
      </p>
    </div>
  );
}
