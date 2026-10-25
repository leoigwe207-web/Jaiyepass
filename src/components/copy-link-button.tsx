"use client";

import { useState } from "react";

export function CopyLinkButton({ url, label = "Copy invite link" }: { url: string; label?: string }) {
  const [note, setNote] = useState<string | null>(null);

  async function copy() {
    try {
      const absolute = url.startsWith("http") ? url : `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(absolute);
      setNote("Copied");
    } catch {
      setNote("Copy failed");
    }
    setTimeout(() => setNote(null), 2000);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="text-sm font-semibold text-ink-soft underline underline-offset-2"
      >
        {label}
      </button>
      {note && (
        <span role="status" className="text-xs font-semibold text-success">
          {note}
        </span>
      )}
    </span>
  );
}
