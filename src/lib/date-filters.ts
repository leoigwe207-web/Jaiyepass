/** Nigerian event discovery calendar. Lagos/WAT is UTC+1 year-round. */
export type EventDateFilter = "today" | "weekend" | "week" | "month";
const WAT_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Inclusive start and exclusive end, UTC ISO timestamps for Postgres. */
export function eventDateRange(filter: EventDateFilter, now = new Date()): { start: string; end: string } {
  const t = now.getTime();
  const local = new Date(t + WAT_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const start = new Date(t);
  let end: Date;
  if (filter === "today") {
    end = new Date(Date.UTC(y, m, d + 1) - WAT_OFFSET_MS);
  } else if (filter === "week") {
    end = new Date(t + 7 * DAY_MS);
  } else if (filter === "month") {
    end = new Date(Date.UTC(y, m + 1, 1) - WAT_OFFSET_MS);
  } else {
    const dow = local.getUTCDay();
    const offsetToSaturday = dow === 0 || dow === 6 ? 0 : (6 - dow + 7) % 7;
    const saturday = new Date(Date.UTC(y, m, d + offsetToSaturday) - WAT_OFFSET_MS);
    if (offsetToSaturday > 0) start.setTime(saturday.getTime());
    // For Sunday use Monday midnight; otherwise two-day weekend ends Monday.
    const untilMonday = dow === 0 ? 1 : 2;
    end = new Date(saturday.getTime() + untilMonday * DAY_MS);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}
