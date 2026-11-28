const UNITS = [
  ["d", 86400],
  ["h", 3600],
  ["min", 60],
] as const;

/** REQ-QA-018: the two largest non-zero units of days, hours and minutes; "< 1 min" below a minute. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return "< 1 min";
  let rest = Math.floor(seconds);
  const parts: string[] = [];
  for (const [unit, size] of UNITS) {
    const count = Math.floor(rest / size);
    rest -= count * size;
    if (count > 0) parts.push(`${count} ${unit}`);
  }
  return parts.slice(0, 2).join(" ");
}

/** How long ago `from` was, as `formatDuration`. */
export const sinceText = (from: string, now: Date): string => formatDuration((now.getTime() - new Date(from).getTime()) / 1000);
