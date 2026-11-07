/**
 * Organizer ticket sales schedules are entered in Nigeria (WAT, UTC+01:00).
 * `datetime-local` fields do not carry timezone information, so
 * interpreting them in Node's UTC server timezone shifts sales by an hour.
 *
 * Nigeria has no daylight-saving transition: WAT is always UTC+01:00.
 */
const WAT_OFFSET_MS = 60 * 60 * 1000;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

export function lagosLocalToUtcIso(local: string): string | null {
  if (!LOCAL_DATETIME.test(local)) return null;
  const instant = new Date(local + "+01:00");
  if (Number.isNaN(instant.getTime())) return null;
  // Reject normalized invalid dates (e.g. Feb 30) and malformed input.
  const roundTrip = new Date(instant.getTime() + WAT_OFFSET_MS).toISOString();
  if (roundTrip.slice(0, local.length) !== local) return null;
  return instant.toISOString();
}

const WAT_DATE = new Intl.DateTimeFormat("en-NG", {
  weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos",
});
const WAT_CLOCK = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Lagos",
});

export function formatLagosTicketDateTime(date: Date | string): string {
  const instant = new Date(date);
  return `${WAT_DATE.format(instant)} · ${WAT_CLOCK.format(instant)} WAT`;
}
