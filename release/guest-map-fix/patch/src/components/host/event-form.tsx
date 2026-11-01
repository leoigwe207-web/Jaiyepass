"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/host/actions";
import { categoryDisplayName } from "@/lib/category-labels";

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
    <form action={formAction} className="jp-event-editor space-y-9">
      <section className="jp-editor-section" aria-labelledby="event-basics-title">
        <div className="jp-section-head">
          <span className="jp-section-number" aria-hidden="true">01</span>
          <div>
            <h2 id="event-basics-title" className="jp-section-title">Tell people what is happening</h2>
            <p className="jp-section-subtitle">A clear name and description help people decide to attend.</p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="jp-form-field">
            <label htmlFor="ev-title" className="jp-field-label">Event name <span className="text-neon-deep" aria-hidden="true">*</span></label>
            <input id="ev-title" name="title" required minLength={4} maxLength={120} defaultValue={d.title} placeholder="e.g. The City Sessions — Live in Abuja" className="jp-form-control" />
          </div>
          <div className="jp-form-field">
            <label htmlFor="ev-tagline" className="jp-field-label">Short introduction <span className="jp-optional">Optional</span></label>
            <input id="ev-tagline" name="tagline" maxLength={160} defaultValue={d.tagline} placeholder="e.g. An unforgettable night of music, art and community" className="jp-form-control" />
            <p className="jp-field-hint">One compelling sentence displayed alongside your event title.</p>
          </div>
          <div className="jp-form-field">
            <label htmlFor="ev-description" className="jp-field-label">About the event <span className="text-neon-deep" aria-hidden="true">*</span></label>
            <textarea id="ev-description" name="description" required minLength={20} maxLength={8000} rows={6} defaultValue={d.description} placeholder={"What can guests expect?\n\nTell them about the experience, the lineup, the schedule and anything they should bring."} className="jp-form-control jp-form-textarea" />
            <p className="jp-field-hint">Include the line-up, schedule, what to bring and any important house rules.</p>
          </div>
        </div>
      </section>

      <section className="jp-editor-section" aria-labelledby="event-location-title">
        <div className="jp-section-head">
          <span className="jp-section-number" aria-hidden="true">02</span>
          <div>
            <h2 id="event-location-title" className="jp-section-title">Place & category</h2>
            <p className="jp-section-subtitle">Help the right people find your event anywhere in Nigeria.</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="jp-form-field">
            <label htmlFor="ev-city" className="jp-field-label">City <span className="text-neon-deep" aria-hidden="true">*</span></label>
            <select id="ev-city" name="cityId" required defaultValue={d.cityId} className="jp-form-control jp-form-select">
              <option value="" disabled>Select an event city</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="jp-form-field">
            <label htmlFor="ev-category" className="jp-field-label">Event category <span className="jp-optional">Optional</span></label>
            <select id="ev-category" name="categoryId" defaultValue={d.categoryId} className="jp-form-control jp-form-select">
              <option value="">Choose the best fit</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{categoryDisplayName(c.name)}</option>)}
            </select>
            <p className="jp-field-hint">Choose the category that best describes the experience.</p>
          </div>
          <div className="jp-form-field">
            <label htmlFor="ev-venue" className="jp-field-label">Venue name <span className="text-neon-deep" aria-hidden="true">*</span></label>
            <input id="ev-venue" name="venueName" required minLength={2} maxLength={120} defaultValue={d.venueName} placeholder="e.g. The Civic Centre" className="jp-form-control" />
          </div>
          <div className="jp-form-field">
            <label htmlFor="ev-address" className="jp-field-label">Venue address <span className="text-neon-deep" aria-hidden="true">*</span></label>
            <input id="ev-address" name="venueAddress" required minLength={4} maxLength={200} defaultValue={d.venueAddress} placeholder="Street, area and landmark" className="jp-form-control" />
          </div>
        </div>
      </section>

      <section className="jp-editor-section" aria-labelledby="event-schedule-title">
        <div className="jp-section-head">
          <span className="jp-section-number" aria-hidden="true">03</span>
          <div>
            <h2 id="event-schedule-title" className="jp-section-title">Date, time & guest information</h2>
            <p className="jp-section-subtitle">All dates and times are interpreted in your device's local timezone.</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="jp-form-field">
            <label htmlFor="ev-starts" className="jp-field-label">Event starts <span className="text-neon-deep" aria-hidden="true">*</span></label>
            <input id="ev-starts" name="startsAt" type="datetime-local" required defaultValue={toLocalInput(d.startsAt)} className="jp-form-control" />
          </div>
          <div className="jp-form-field">
            <label htmlFor="ev-doors" className="jp-field-label">Doors open <span className="jp-optional">Optional</span></label>
            <input id="ev-doors" name="doorsOpenAt" type="datetime-local" defaultValue={toLocalInput(d.doorsOpenAt)} className="jp-form-control" />
          </div>
          <div className="jp-form-field">
            <label htmlFor="ev-age" className="jp-field-label">Age requirement <span className="jp-optional">Optional</span></label>
            <input id="ev-age" name="ageGuidance" maxLength={80} defaultValue={d.ageGuidance} placeholder="e.g. All ages, or 18+ with valid ID" className="jp-form-control" />
          </div>
          <div className="jp-form-field sm:col-span-2">
            <label htmlFor="ev-refund" className="jp-field-label">Refund policy <span className="jp-optional">Optional</span></label>
            <textarea id="ev-refund" name="refundPolicy" maxLength={1000} rows={3} defaultValue={d.refundPolicy} placeholder="Explain when refunds are available and any exceptions." className="jp-form-control jp-form-textarea" />
            <p className="jp-field-hint">Leave this blank to use the JaiyePass default refund policy.</p>
          </div>
        </div>
      </section>

      {state.error && <p role="alert" className="auth-notice auth-notice-error">{state.error}</p>}
      <div className="jp-editor-footer">
        <p className="text-xs leading-relaxed text-ink-faint">Your draft stays private until you submit it for review.</p>
        <button type="submit" disabled={pending} className="jp-form-submit w-full sm:w-auto">
          {pending ? "Saving your draft…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
