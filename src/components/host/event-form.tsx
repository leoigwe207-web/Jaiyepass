"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/host/actions";

export interface EventFormDefaults {
  title: string;
  tagline: string;
  description: string;
  cityId: string;
  venueName: string;
  venueAddress: string;
  categoryId: string;
  startsAt: string;
  endsAt: string;
  doorsOpenAt: string;
  ageGuidance: string;
  refundPolicy: string;
}

export const EMPTY_EVENT: EventFormDefaults = {
  title: "",
  tagline: "",
  description: "",
  cityId: "",
  venueName: "",
  venueAddress: "",
  categoryId: "",
  startsAt: "",
  endsAt: "",
  doorsOpenAt: "",
  ageGuidance: "",
  refundPolicy: "",
};

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  action,
  cities,
  categories,
  defaults,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  cities: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  defaults: EventFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const d = defaults;

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="ev-title" className="mb-1 block text-sm font-semibold">
          Event title
        </label>
        <input id="ev-title" name="title" required minLength={4} maxLength={120} defaultValue={d.title} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
      </div>

      <div>
        <label htmlFor="ev-tagline" className="mb-1 block text-sm font-semibold">
          Tagline (optional)
        </label>
        <input id="ev-tagline" name="tagline" maxLength={160} defaultValue={d.tagline} placeholder="One line that sells the vibe" className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
      </div>

      <div>
        <label htmlFor="ev-description" className="mb-1 block text-sm font-semibold">
          Description
        </label>
        <textarea id="ev-description" name="description" required minLength={20} maxLength={8000} rows={8} defaultValue={d.description} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
        <p className="mt-1 text-xs text-ink-faint">
          Line-up, schedule, what to bring, house rules. Be specific — clear listings sell more tickets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ev-city" className="mb-1 block text-sm font-semibold">
            City
          </label>
          <select id="ev-city" name="cityId" required defaultValue={d.cityId} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm">
            <option value="" disabled>
              Choose a city
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ev-category" className="mb-1 block text-sm font-semibold">
            Category (optional)
          </label>
          <select id="ev-category" name="categoryId" defaultValue={d.categoryId} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm">
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ev-venue" className="mb-1 block text-sm font-semibold">
            Venue name
          </label>
          <input id="ev-venue" name="venueName" required minLength={2} maxLength={120} defaultValue={d.venueName} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="ev-address" className="mb-1 block text-sm font-semibold">
            Venue address
          </label>
          <input id="ev-address" name="venueAddress" required minLength={4} maxLength={200} defaultValue={d.venueAddress} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="ev-starts" className="mb-1 block text-sm font-semibold">
            Starts
          </label>
          <input id="ev-starts" name="startsAt" type="datetime-local" required defaultValue={toLocalInput(d.startsAt)} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="ev-ends" className="mb-1 block text-sm font-semibold">
            Ends
          </label>
          <input id="ev-ends" name="endsAt" type="datetime-local" required defaultValue={toLocalInput(d.endsAt)} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="ev-doors" className="mb-1 block text-sm font-semibold">
            Doors open (optional)
          </label>
          <input id="ev-doors" name="doorsOpenAt" type="datetime-local" defaultValue={toLocalInput(d.doorsOpenAt)} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ev-age" className="mb-1 block text-sm font-semibold">
            Age guidance (optional)
          </label>
          <input id="ev-age" name="ageGuidance" maxLength={80} defaultValue={d.ageGuidance} placeholder="18+ with valid ID" className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="ev-refund" className="mb-1 block text-sm font-semibold">
            Refund policy (optional)
          </label>
          <textarea id="ev-refund" name="refundPolicy" maxLength={1000} rows={2} defaultValue={d.refundPolicy} className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm" />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-card bg-neon px-6 py-3 text-sm font-bold text-white hover:bg-neon-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
