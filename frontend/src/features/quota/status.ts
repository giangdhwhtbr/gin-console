import { isQuotaError, type ClaudeQuota, type CodexQuota, type CodexWindow, type QuotaError } from "./api";

export type Level = "ok" | "near" | "limited" | "no-data" | "error";
export type Status = { level: Level; percent: number | null };

export const NEAR_PERCENT = 80;
export const LIMITED_PERCENT = 100;
export const LEVEL_LABEL: Record<Level, string> = {
  ok: "ok",
  near: "near the limit",
  limited: "limited",
  "no-data": "no data",
  error: "error",
};

function fromPercents(percents: number[], blocked: boolean): Status {
  const percent = percents.length > 0 ? Math.max(...percents) : null;
  if (blocked || (percent !== null && percent >= LIMITED_PERCENT)) return { level: "limited", percent };
  if (percent === null) return { level: "no-data", percent };
  if (percent >= NEAR_PERCENT) return { level: "near", percent };
  return { level: "ok", percent };
}

export function claudeStatus(side: ClaudeQuota | QuotaError): Status {
  if (isQuotaError(side)) return { level: "error", percent: null };
  return fromPercents(side.windows.map((w) => w.used_percent), false);
}

export function codexStatus(side: CodexQuota | QuotaError): Status {
  if (isQuotaError(side)) return { level: "error", percent: null };
  const windows = [side.primary, side.secondary].filter((w): w is CodexWindow => w !== null);
  return fromPercents(windows.map((w) => w.used_percent), side.ordinary_usage_allowed === false);
}
