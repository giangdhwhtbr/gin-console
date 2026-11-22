const relative = new Intl.RelativeTimeFormat("en", { numeric: "always" });

export function formatAge(fromIso: string, nowMs: number): string {
  const seconds = Math.round((nowMs - Date.parse(fromIso)) / 1000);
  if (!Number.isFinite(seconds) || seconds < 45) return "just now";
  if (seconds < 3600) return relative.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86_400) return relative.format(-Math.round(seconds / 3600), "hour");
  return relative.format(-Math.round(seconds / 86_400), "day");
}
