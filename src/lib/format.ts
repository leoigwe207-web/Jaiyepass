const DATE_FMT = new Intl.DateTimeFormat("en-NG", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const TIME_FMT = new Intl.DateTimeFormat("en-NG", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(iso: string | Date): string {
  return DATE_FMT.format(new Date(iso));
}

export function formatTime(iso: string | Date): string {
  return TIME_FMT.format(new Date(iso));
}

export function formatDateTime(iso: string | Date): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function formatDateRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return `${formatDate(s)}, ${formatTime(s)} – ${formatTime(e)}`;
  return `${formatDate(s)}, ${formatTime(s)} – ${formatDate(e)}, ${formatTime(e)}`;
}

export function isFree(priceKobo: number): boolean {
  return priceKobo === 0;
}

/** e.g. "Ends in 3h 20m" / "Ends tomorrow" for countdowns. */
export function relativeDeadline(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `Ends in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Ends in ${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}
