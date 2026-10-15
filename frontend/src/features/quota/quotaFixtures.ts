import type { ClaudeQuota, CodexQuota, Quota } from "./api";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const LABELS = ["session", "week (all models)", "week (Sonnet only)"];

export const claudeQuota = (...percents: number[]): ClaudeQuota => ({
  windows: percents.map((used_percent, i) => ({
    label: LABELS[i] ?? `window ${i}`,
    used_percent,
    resets_at: "2026-10-20T12:00:00Z",
  })),
  fetched_at: "2026-10-15T03:00:00Z",
});

export const codexQuota = (overrides: Partial<CodexQuota> = {}): CodexQuota => ({
  plan_type: "plus",
  ordinary_usage_allowed: true,
  rate_limit_reached_type: null,
  reset_credits_available: 0,
  primary: { used_percent: 16, window_minutes: 300, resets_at: "2026-10-15T08:00:00Z" },
  secondary: null,
  fetched_at: "2026-10-15T03:00:00Z",
  ...overrides,
});

export const quota = (
  claude: Quota["claude"] = claudeQuota(41, 25),
  codex: Quota["codex"] = codexQuota(),
): Quota => ({ claude, codex });
