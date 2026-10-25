"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinPlanAction, leavePlanAction } from "@/app/plans/actions";

export function JoinPlanButton({
  planId,
  shareCode,
  joined,
  signedIn,
}: {
  planId: string;
  shareCode: string;
  joined: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(`/plans/${shareCode}`)}`);
      return;
    }
    const result = joined ? await leavePlanAction(planId) : await joinPlanAction(planId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={
          joined
            ? "rounded-card border border-line px-5 py-2.5 text-sm font-bold hover:border-ink disabled:opacity-60"
            : "rounded-card bg-neon px-5 py-2.5 text-sm font-bold text-white hover:bg-neon-deep disabled:opacity-60"
        }
      >
        {busy ? "…" : joined ? "Leave plan" : "Join this plan"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
