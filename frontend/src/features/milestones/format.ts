const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** UTC midnight of an ISO date, so the browser's timezone never moves a day. */
export const utcOf = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "2 Nov", with the year when it is not the year of `today` (the JSON's today, never the browser's). */
export function shortDate(iso: string, today: string): string {
  const day = utcOf(iso);
  const year = iso.slice(0, 4) === today.slice(0, 4) ? "" : ` ${iso.slice(0, 4)}`;
  return `${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}${year}`;
}

export const monthName = (index: number): string => MONTHS[index];
export const weekday = (iso: string): string => WEEKDAYS[utcOf(iso).getUTCDay()];
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const percent = (ratio: number) => `${Math.round(100 * ratio)}%`;
export const oneDecimal = (n: number) => n.toFixed(1);
export const twoDecimals = (n: number) => n.toFixed(2);

/** Working days (Monday to Friday) after `end` up to and including `finish`, as gin-workflow `workdays_after`. */
export function workdaysAfter(end: string, finish: string): number {
  let count = 0;
  const day = utcOf(end);
  const last = utcOf(finish).getTime();
  for (day.setUTCDate(day.getUTCDate() + 1); day.getTime() <= last; day.setUTCDate(day.getUTCDate() + 1)) {
    if (day.getUTCDay() % 6 !== 0) count += 1;
  }
  return count;
}

/** REQ-MILESTONE-UI-020: "Away: ann 18–20 Nov, bao 25 Nov" from `{member: ["2026-11-18..2026-11-20", "2026-11-25"]}`; null when nobody is away. A range that is not a date or `from..to` is shown as it came. */
export function awayLine(away: Readonly<Record<string, readonly string[]>>, today: string): string | null {
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const range = (value: string) => {
    const [from, to, ...rest] = value.split("..");
    if (!ISO.test(from) || rest.length > 0 || (to !== undefined && !ISO.test(to))) return value;
    if (to === undefined || to === from) return shortDate(from, today);
    const a = shortDate(from, today);
    const b = shortDate(to, today);
    // the same month and year: "18–20 Nov"
    return from.slice(0, 7) === to.slice(0, 7) ? `${a.split(" ")[0]}–${b}` : `${a}–${b}`;
  };
  const people = Object.entries(away).flatMap(([member, ranges]) => (ranges.length === 0 ? [] : [`${member} ${ranges.map(range).join(", ")}`]));
  return people.length === 0 ? null : `Away: ${people.join(", ")}`;
}
