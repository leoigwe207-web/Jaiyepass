"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/host/actions";

function ErrorLine({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="mt-2 rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
      {state.error}
    </p>
  );
}

export function TicketTypeForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-4 rounded-card border border-line bg-paper p-4">
      <h3 className="text-sm font-bold">Add a ticket type</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input name="name" required minLength={2} maxLength={80} placeholder="Regular, VIP, Early bird…" className="rounded-card border border-line bg-white px-3 py-2 text-sm" />
        <input name="priceNaira" required inputMode="decimal" placeholder="Price in ₦ (0 for free)" className="rounded-card border border-line bg-white px-3 py-2 text-sm" />
        <input name="quantity" required type="number" min={1} max={1000000} placeholder="Quantity available" className="rounded-card border border-line bg-white px-3 py-2 text-sm" />
        <input name="perOrderLimit" type="number" min={1} max={100} defaultValue={10} placeholder="Max per order" className="rounded-card border border-line bg-white px-3 py-2 text-sm" />
        <input name="description" maxLength={400} placeholder="Description (optional)" className="rounded-card border border-line bg-white px-3 py-2 text-sm sm:col-span-2" />
        <label className="text-xs text-ink-faint">
          Sales start (optional)
          <input name="salesStartAt" type="datetime-local" className="mt-1 w-full rounded-card border border-line bg-white px-3 py-2 text-sm" />
        </label>
        <label className="text-xs text-ink-faint">
          Sales end (optional)
          <input name="salesEndAt" type="datetime-local" className="mt-1 w-full rounded-card border border-line bg-white px-3 py-2 text-sm" />
        </label>
      </div>
      <ErrorLine state={state} />
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-card bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-night disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add ticket type"}
      </button>
    </form>
  );
}

export function PromoForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-4 rounded-card border border-line bg-paper p-4">
      <h3 className="text-sm font-bold">Create a promo code</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input name="code" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_-]+" placeholder="CREW10" className="rounded-card border border-line bg-white px-3 py-2 text-sm uppercase" />
        <select name="kind" defaultValue="percentage" className="rounded-card border border-line bg-white px-3 py-2 text-sm">
          <option value="percentage">Percentage off (%)</option>
          <option value="fixed">Fixed amount off (₦)</option>
        </select>
        <input name="value" required inputMode="decimal" placeholder="% or ₦ value" className="rounded-card border border-line bg-white px-3 py-2 text-sm" />
        <input name="maxRedemptions" type="number" min={1} max={100000} placeholder="Max redemptions (optional)" className="rounded-card border border-line bg-white px-3 py-2 text-sm" />
      </div>
      <ErrorLine state={state} />
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-card bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-night disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create code"}
      </button>
    </form>
  );
}

export function ScannerForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-4 rounded-card border border-line bg-paper p-4">
      <h3 className="text-sm font-bold">Add a door scanner</h3>
      <p className="mt-1 text-xs text-ink-faint">
        They need a JaiyePass account (their email). Scanners can only scan tickets for this event.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input name="email" type="email" required maxLength={254} placeholder="crew@example.com" className="w-full rounded-card border border-line bg-white px-3 py-2 text-sm" />
        <button
          type="submit"
          disabled={pending}
          className="rounded-card bg-ink px-4 py-2 text-xs font-bold text-paper hover:bg-night disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add scanner"}
        </button>
      </div>
      <ErrorLine state={state} />
    </form>
  );
}

export function PayoutForm({
  action,
  availableNaira,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  availableNaira: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  if (state.ok) {
    return (
      <p role="status" className="rounded-card border border-success/30 bg-success/5 p-4 text-sm text-success">
        Payout requested — our team reviews requests within one business day.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="payout-amount" className="mb-1 block text-sm font-semibold">
            Amount to withdraw (₦)
          </label>
          <input
            id="payout-amount"
            name="amountNaira"
            required
            inputMode="decimal"
            placeholder={`Available: ₦${availableNaira}`}
            className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-card bg-neon px-5 py-3 text-sm font-bold text-white hover:bg-neon-deep disabled:opacity-60"
        >
          {pending ? "Requesting…" : "Request payout"}
        </button>
      </div>
      <ErrorLine state={state} />
    </form>
  );
}
