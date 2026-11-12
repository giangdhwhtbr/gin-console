import { field } from "@/lib/guards";
import { failure } from "./api";

export type MilestoneStatus = "active" | "scheduled" | "planned" | "closed";
export type TeamMilestone = { id: string; title: string; status: MilestoneStatus; start: string; end: string; closed_on: string | null };
export type Bucket = "open" | "in_progress" | "closed";
export type TeamBead = {
  id: string;
  title: string;
  issue_type: string;
  status: string;
  bucket: Bucket;
  assignee: string | null;
  priority: number | null;
  created_at: string;
  epic: { id: string; title: string };
  started_at: string | null;
  closed_at: string | null;
  cycle_days: number | null;
  age_days: number | null;
  late_days: number | null;
  rework: number | null;
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
};
export type MemberFigures = TeamFigures & { member: string };
export type TeamTotals = TeamFigures & {
  working_days: number;
  elapsed: number;
  days_left: number;
  pace: number;
  pace_needed: number | null;
  late_open: number;
};
export type DayRow = { date: string; closed: Record<string, number> };
export type TeamReport = {
  generated_at: string;
  project: string;
  today: string;
  milestones: TeamMilestone[];
  undated: number;
  milestone: string | null;
  team: TeamTotals | null;
  members: MemberFigures[];
  days: DayRow[];
  beads: TeamBead[];
};

export const UNASSIGNED = "Unassigned";

const ARRAYS = ["milestones", "members", "days", "beads"];

// simplified: checks the shape down to the arrays, not every row; the backend's pydantic model owns the rows.
function isTeamReport(value: unknown): value is TeamReport {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof field(value, "generated_at") === "string" &&
    ARRAYS.every((key) => Array.isArray(field(value, key)))
  );
}

export async function fetchTeam(project: string, milestone: string): Promise<TeamReport> {
  const params = new URLSearchParams({ project });
  if (milestone !== "") params.set("milestone", milestone);
  const response = await fetch(`/api/reports/team?${params.toString()}`);
  if (!response.ok) throw await failure(response);
  const body: unknown = await response.json();
  if (!isTeamReport(body)) throw new Error("Could not load the team report (unexpected response)");
  return body;
}

export const selectedMilestone = (report: TeamReport): TeamMilestone | null =>
  report.milestones.find((m) => m.id === report.milestone) ?? null;
