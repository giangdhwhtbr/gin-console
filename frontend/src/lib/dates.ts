const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const two = (n: number): string => String(n).padStart(2, "0");

interface Parts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

/** A calendar day (`YYYY-MM-DD`) is read as that day in UTC; a timestamp in the browser's time zone; anything else is null. */
function partsOf(iso: string): Parts | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (DAY.test(iso)) {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), hour: 0, minute: 0 };
  }
  return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() };
}

/** The browser's local date, `YYYY-MM-DD`. */
function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

const withYear = (p: Parts, show: boolean): string => `${p.day} ${MONTHS[p.month]}${show ? ` ${p.year}` : ""}`;
const yearOf = (today: string): number => Number(today.slice(0, 4));

/** REQ-UI-131: "5 Nov", or "1 Dec 2025" outside the current year (`today`, `YYYY-MM-DD`, defaults to the browser's date). */
export function formatDate(iso: string, today: string = localToday()): string {
  const p = partsOf(iso);
  return p === null ? iso : withYear(p, p.year !== yearOf(today));
}

/** REQ-UI-131: "11 May, 16:00", or "11 May 2025, 16:00" outside the current year, in the browser's time zone. */
export function formatDateTime(iso: string, today: string = localToday()): string {
  const p = partsOf(iso);
  return p === null ? iso : `${withYear(p, p.year !== yearOf(today))}, ${two(p.hour)}:${two(p.minute)}`;
}

/** REQ-UI-131: "10 Nov – 1 Dec"; one other year once after the end ("3 Nov – 28 Nov 2025"); two years after each end. */
export function formatRange(start: string, end: string, today: string = localToday()): string {
  const a = partsOf(start);
  const b = partsOf(end);
  if (a === null || b === null) return `${formatDate(start, today)} – ${formatDate(end, today)}`;
  const current = yearOf(today);
  const same = a.year === b.year;
  return `${withYear(a, !same)} – ${withYear(b, !same || b.year !== current)}`;
}
