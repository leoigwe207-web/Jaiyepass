"use client";

import { useEffect, useState } from "react";

/**
 * Renders the ticket QR code. The payload contains only the ticket reference
 * and its HMAC signature — never personal or payment data.
 */
export function QRTicket({ payload, disabled = false }: { payload: string; disabled?: boolean }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!payload || disabled) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(payload, {
          width: 320,
          margin: 1,
          color: { dark: "#16120e", light: "#ffffff" },
          errorCorrectionLevel: "M",
        }),
      )
      .then((url) => !cancelled && setDataUrl(url))
      .catch(() => !cancelled && setDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [payload, disabled]);

  if (disabled) {
    return (
      <div
        className="flex aspect-square w-40 items-center justify-center rounded-card border border-line bg-paper-dim text-center text-xs font-semibold text-ink-faint"
        aria-label="QR code not available for this ticket"
      >
        QR not
        <br />
        available
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className="skeleton aspect-square w-40 rounded-card"
        role="status"
        aria-label="Generating QR code"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="Ticket QR code"
      width={160}
      height={160}
      className="aspect-square w-40 rounded-card border border-line"
    />
  );
}
