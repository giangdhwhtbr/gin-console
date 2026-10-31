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
