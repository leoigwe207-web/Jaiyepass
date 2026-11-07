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
  const controlsRef = useRef<{ stop(): void } | null>(null);
  const cameraGenerationRef = useRef(0);
  const busyRef = useRef(false);
  const selectedEventRef = useRef(eventId);
  selectedEventRef.current = eventId;

  const currentTitle = events.find((e) => e.id === eventId)?.title ?? "";

  async function submitScan(payload: string) {
    const clean = payload.trim();
    if (!clean || !selectedEventRef.current || busyRef.current) return;
    // Debounce identical codes for 3s (the camera loop fires repeatedly).
    if (lastScanned.current === clean) return;

    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: clean, eventId: selectedEventRef.current }),
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
    busyRef.current = false;
    setBusy(false);
    lastScanned.current = clean;
    window.setTimeout(() => {
      if (lastScanned.current === clean) lastScanned.current = "";
    }, 3000);
  }

  function stopCamera() {
    // Invalidate a camera request that might still be awaiting permission.
    cameraGenerationRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null | undefined;
    stream?.getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
    setCameraOn(false);
  }

  async function startCamera() {
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera scanning requires HTTPS and browser camera access. Use manual entry instead.");
      return;
    }
    setCameraError(null);
    setCameraOn(true);
    const generation = ++cameraGenerationRef.current;
    try {
      // ZXing works in browsers without the experimental BarcodeDetector API.
      // The camera and decoding library load only after the organizer taps Start.
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (generation !== cameraGenerationRef.current) return;
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
        if (result) void submitScan(result.getText());
      });
      if (generation !== cameraGenerationRef.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
    } catch {
      if (generation !== cameraGenerationRef.current) return;
      stopCamera();
      setCameraError("Could not open the camera. Allow access in browser settings, or enter the ticket code below.");
    }
  }

  useEffect(() => () => {
    cameraGenerationRef.current += 1;
    controlsRef.current?.stop();
    const stream = videoRef.current?.srcObject as MediaStream | null | undefined;
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

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
