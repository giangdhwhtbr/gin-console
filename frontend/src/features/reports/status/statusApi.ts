import type { ChildCounts } from "@/features/beads/api";
import { field } from "@/lib/guards";
import { failure } from "../api";
import { scopeQuery, type Scope } from "../filters";
import type { TeamMilestone } from "../teamApi";

export type StatusPeriod = {
  kickoff: string | null;
  working_days: number;
  elapsed: number;
  days_left: number;
};

export type BeadsKpi = {
  done: number | null;
  scope: number | null;
  done_week_ago: number | null;
  scope_week_ago: number | null;
};

export type PointsKpi = {
  done: number | null;
  scope: number | null;
  at_kickoff: number | null;
  done_week_ago: number | null;
};

export type PaceKpi = {
  pace: number | null;
  pace_needed: number | null;
  pace_week_ago: number | null;
};

export type BlockedKpi = {
  count: number;
  oldest_days: number | null;
};

export type ReworkKpi = {
  rate: number | null;
  rate_week_ago: number | null;
};

export type StatusKpis = {
  beads: BeadsKpi;
  points: PointsKpi;
  pace: PaceKpi;
  blocked: BlockedKpi;
  rework: ReworkKpi;
};

export type BurnupDay = {
  day: string;
  scope_points: number;
  done_points: number;
};

export type ChangeKind = "epic_added" | "epic_removed" | "estimated" | "re_estimated" | "bug_added";

export type ScopeChange = {
  day: string;
  kind: ChangeKind;
  id: string;
  title: string;
  points: number | null;
  from: number | null;
  to: number | null;
  epic: { id: string; title: string } | null;
  person: string | null;
};

export type Changes = {
  scope_from: number | null;
  scope_to: number | null;
  items: ScopeChange[];
};

export type Blocker = {
  id: string;
  title: string;
  person: string;
  blocked: boolean;
};

export type BlockedRisk = {
  id: string;
  title: string;
  days: number;
  blocker: Blocker | null;
};

export type Risks = {
  blocked: BlockedRisk[];
  blocked_more: number;
  unestimated: { id: string; title: string }[];
};

export type StatusEpic = {
  id: string;
  title: string;
  status: string;
  points: number | null;
  person: string;
  closed_on: string | null;
  child_counts: ChildCounts;
};

export type StatusReport = {
  generated_at: string;
  project: string;
  today: string;
  milestones: TeamMilestone[];
  undated: number;
  milestone: string | null;
  days: number | null;
  period: StatusPeriod | null;
  kpis: StatusKpis;
  burnup: BurnupDay[];
  changes: Changes;
  risks: Risks;
  epics: StatusEpic[];
};

const ARRAYS = ["milestones", "burnup", "epics"];
const OBJECTS = ["kpis", "changes", "risks"];
const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;

function isStatusReport(value: unknown): value is StatusReport {
  if (!isObject(value)) return false;
  if (typeof field(value, "generated_at") !== "string" || typeof field(value, "today") !== "string") return false;
  if (!ARRAYS.every((key) => Array.isArray(field(value, key)))) return false;
  if (!OBJECTS.every((key) => isObject(field(value, key)))) return false;
  const changes = field(value, "changes") as object;
  const risks = field(value, "risks") as object;
  return Array.isArray(field(changes, "items")) && Array.isArray(field(risks, "blocked")) && Array.isArray(field(risks, "unestimated"));
}

/** REQ-REPORTS-020: fetches the status report for a project and scope. */
export async function fetchStatus(project: string, scope: Scope): Promise<StatusReport> {
  const params = new URLSearchParams({ project });
  if (scope.kind !== "default") for (const [key, value] of scopeQuery(scope)) params.set(key, value);
  const response = await fetch(`/api/reports/status?${params.toString()}`);
  if (!response.ok) throw await failure(response);
  const body: unknown = await response.json();
  if (!isStatusReport(body)) throw new Error("Could not load the status report (unexpected response)");
  return body;
}

export const selectedStatusMilestone = (report: StatusReport): TeamMilestone | null =>
  report.milestones.find((m) => m.id === report.milestone) ?? null;
