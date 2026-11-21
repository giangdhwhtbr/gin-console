const relative = new Intl.RelativeTimeFormat("en", { numeric: "always" });

export function formatAge(fromIso: string, nowMs: number): string {
  const seconds = Math.round((nowMs - Date.parse(fromIso)) / 1000);
  if (!Number.isFinite(seconds) || seconds < 45) return "just now";
  if (seconds < 3600) return relative.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86_400) return relative.format(-Math.round(seconds / 3600), "hour");
  return relative.format(-Math.round(seconds / 86_400), "day");
}

/** Local time, then the same instant in UTC, for a reset time. */
export function formatTimes(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const utc = `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  return `${date.toLocaleString()} (${utc})`;
}
