import { field } from "@/lib/guards";
import { failure } from "./api";
import { scopeQuery, type Scope } from "./filters";
import { apiFetch } from "@/app/session";

export type MilestoneStatus = "active" | "scheduled" | "planned" | "closed";
export type TeamMilestone = { id: string; title: string; status: MilestoneStatus; start: string; end: string; closed_on: string | null };
export type Bucket = "open" | "in_progress" | "closed";
export type TeamBead = {
  id: string;
  title: string;
  issue_type: string;
  status: string;
  bucket: Bucket;
  blocked: boolean;
  assignee: string | null;
  priority: number | null;
  created_at: string;
  epic: { id: string; title: string };
  started_at: string | null;
  closed_at: string | null;
  cycle_days: number | null;
  age_days: number | null;
  late_days: number | null;
  rework: number;
};
export type TeamFigures = {
  scope: number;
  closed: number;
  in_progress: number;
  open: number;
  blocked: number;
  unclaimed: number;
  done: number | null;
  throughput: number;
  cycle_median: number | null;
  oldest_in_progress: number | null;
  on_time: number | null;
  rework_rate: number | null;
  reopens: number;
  bugs: number;
  points_delivered: number;
  accuracy: number | null;
};
export type MemberFigures = TeamFigures & { member: string };
export type TeamTotals = TeamFigures & {
  /** null for a period, like `pace_needed` */
  working_days: number | null;
  elapsed: number | null;
  days_left: number | null;
  pace: number;
  pace_needed: number | null;
  late_open: number;
};
export type DayRow = { date: string; closed: Record<string, number> };
export type TrendRow = {
  id: string;
  title: string;
  start: string;
  end: string;
  closed: number;
  points_delivered: number;
  on_time: number | null;
  rework_rate: number | null;
  accuracy: number | null;
};
export type Unassigned = { closed: number; total: number };
export type TeamReport = {
  generated_at: string;
  project: string;
  today: string;
  milestones: TeamMilestone[];
  undated: number;
  milestone: string | null;
  /** the period of the scope, or null for a milestone */
  period_days: number | null;
  team: TeamTotals | null;
  members: MemberFigures[];
  days: DayRow[];
  beads: TeamBead[];
  trend: TrendRow[];
  unassigned: Unassigned;
};

export const UNASSIGNED = "Unassigned";

const ARRAYS = ["milestones", "members", "days", "beads", "trend"];

function isUnassigned(value: unknown): value is Unassigned {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof field(value, "closed") === "number" &&
    typeof field(value, "total") === "number"
  );
}

// simplified: checks the shape down to the arrays, not every row; the backend's pydantic model owns the rows.
function isTeamReport(value: unknown): value is TeamReport {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof field(value, "generated_at") === "string" &&
    ARRAYS.every((key) => Array.isArray(field(value, key))) &&
    isUnassigned(field(value, "unassigned"))
  );
}

/** REQ-REPORTS-033: the default scope asks for the server's default milestone. */
export async function fetchTeam(project: string, scope: Scope): Promise<TeamReport> {
  const params = new URLSearchParams({ project });
  if (scope.kind !== "default") for (const [key, value] of scopeQuery(scope)) params.set(key, value);
  const response = await apiFetch(`/api/reports/team?${params.toString()}`);
  if (!response.ok) throw await failure(response);
  const body: unknown = await response.json();
  if (!isTeamReport(body)) throw new Error("Could not load the team report (unexpected response)");
  return body;
}

export const selectedMilestone = (report: TeamReport): TeamMilestone | null =>
  report.milestones.find((m) => m.id === report.milestone) ?? null;
