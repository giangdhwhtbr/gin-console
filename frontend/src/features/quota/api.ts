import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

export type QuotaError = { error: string; raw?: string | null };
export type ClaudeWindow = { label: string; used_percent: number; resets_at: string };
export type ClaudeQuota = { windows: ClaudeWindow[]; fetched_at: string };
export type CodexWindow = {
  used_percent: number;
  window_minutes: number | null;
  resets_at: string | null;
};
export type CodexQuota = {
  plan_type: string | null;
  ordinary_usage_allowed: boolean | null;
  rate_limit_reached_type: string | null;
  reset_credits_available: number;
  primary: CodexWindow | null;
  secondary: CodexWindow | null;
  fetched_at: string;
};
export type Quota = { claude: ClaudeQuota | QuotaError; codex: CodexQuota | QuotaError };

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isNumberOrNull = (value: unknown) => value === null || isFiniteNumber(value);
const isBoolOrNull = (value: unknown) => value === null || typeof value === "boolean";

export function isQuotaError(value: unknown): value is QuotaError {
  return isObject(value) && isString(field(value, "error"));
}

function isClaudeWindow(value: unknown): value is ClaudeWindow {
  return (
    isObject(value) &&
    isString(field(value, "label")) &&
    isFiniteNumber(field(value, "used_percent")) &&
    isString(field(value, "resets_at"))
  );
}

function isClaudeQuota(value: unknown): value is ClaudeQuota {
  if (!isObject(value)) return false;
  const windows = field(value, "windows");
  return Array.isArray(windows) && windows.every(isClaudeWindow) && isString(field(value, "fetched_at"));
}

function isCodexWindow(value: unknown): boolean {
  return (
    value === null ||
    (isObject(value) &&
      isFiniteNumber(field(value, "used_percent")) &&
      isNumberOrNull(field(value, "window_minutes")) &&
      isStringOrNull(field(value, "resets_at")))
  );
}

function isCodexQuota(value: unknown): value is CodexQuota {
  return (
    isObject(value) &&
    isStringOrNull(field(value, "plan_type")) &&
    isBoolOrNull(field(value, "ordinary_usage_allowed")) &&
    isStringOrNull(field(value, "rate_limit_reached_type")) &&
    isFiniteNumber(field(value, "reset_credits_available")) &&
    isCodexWindow(field(value, "primary")) &&
    isCodexWindow(field(value, "secondary")) &&
    isString(field(value, "fetched_at"))
  );
}

function isQuota(value: unknown): value is Quota {
  if (!isObject(value)) return false;
  const claude = field(value, "claude");
  const codex = field(value, "codex");
  return (
    (isQuotaError(claude) || isClaudeQuota(claude)) && (isQuotaError(codex) || isCodexQuota(codex))
  );
}

export async function fetchQuota(refresh: boolean): Promise<Quota> {
  const response = await fetch(refresh ? "/api/quota?refresh=1" : "/api/quota");
  if (!response.ok) {
    throw new Error(`Could not load quota (HTTP ${response.status})`);
  }
  const body: unknown = await response.json();
  if (!isQuota(body)) {
    throw new Error("Could not load quota (unexpected response)");
  }
  return body;
}
