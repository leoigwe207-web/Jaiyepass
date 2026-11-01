"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
}: {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  const styles =
    variant === "primary"
      ? "bg-ink text-paper hover:bg-night disabled:bg-paper-dim disabled:text-ink-faint"
      : "border border-ink text-ink hover:bg-ink hover:text-paper disabled:opacity-60";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`jp-submit-button w-full rounded-card px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${styles}`}
    >
      {pending ? (pendingLabel ?? "Working…") : label}
    </button>
  );
}
