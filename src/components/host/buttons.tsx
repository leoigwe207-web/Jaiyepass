"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/app/host/actions";

/** Generic button that runs a bound server action and refreshes on completion. */
function ActionButton({
  run,
  children,
  variant = "outline",
  confirmMessage,
  disabled,
}: {
  run: () => Promise<ActionState>;
  children: React.ReactNode;
  variant?: "outline" | "primary" | "danger" | "success";
  confirmMessage?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const styles = {
    outline: "border border-line hover:border-ink",
    primary: "bg-ink text-paper hover:bg-night",
    danger: "border border-danger/40 text-danger hover:bg-danger/5",
    success: "border border-success/40 text-success hover:bg-success/5",
  }[variant];

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            const result = await run();
            if (result?.error) setError(result.error);
            else router.refresh();
          });
        }}
        className={`rounded-card px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${styles}`}
      >
        {pending ? "…" : children}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

export function SubmitForReviewButton({ run }: { run: () => Promise<ActionState> }) {
  return (
    <ActionButton run={run} variant="primary" confirmMessage="Submit this event for review by the JaiyePass team?">
      Submit for review
    </ActionButton>
  );
}

export function CancelEventButton({ run }: { run: () => Promise<ActionState> }) {
  return (
    <ActionButton
      run={run}
      variant="danger"
      confirmMessage="Cancel this event? Ticket holders will be notified. This cannot be undone."
    >
      Cancel event
    </ActionButton>
  );
}

export function TicketStatusButton({
  run,
  label,
  danger,
}: {
  run: () => Promise<ActionState>;
  label: string;
  danger?: boolean;
}) {
  return (
    <ActionButton run={run} variant={danger ? "danger" : "outline"}>
      {label}
    </ActionButton>
  );
}

export function ScannerRemoveButton({ run }: { run: () => Promise<ActionState> }) {
  return (
    <ActionButton run={run} variant="danger" confirmMessage="Remove this scanner's access?">
      Remove
    </ActionButton>
  );
}

export function PromoToggleButton({ run, active }: { run: () => Promise<ActionState>; active: boolean }) {
  return (
    <ActionButton run={run} variant={active ? "danger" : "success"}>
      {active ? "Deactivate" : "Activate"}
    </ActionButton>
  );
}

export function RefundDecisionButton({
  run,
  decision,
}: {
  run: () => Promise<ActionState>;
  decision: "approve" | "reject";
}) {
  return (
    <ActionButton
      run={run}
      variant={decision === "approve" ? "success" : "danger"}
      confirmMessage={
        decision === "approve"
          ? "Approve and refund this order? Money returns to the buyer's original payment method."
          : "Reject this refund request?"
      }
    >
      {decision === "approve" ? "Approve refund" : "Reject"}
    </ActionButton>
  );
}
