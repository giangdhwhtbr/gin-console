import { field } from "@/lib/guards";
import type { ReportFilters } from "./filters";

export type Totals = {
  tokens: number;
  cost: number | null;
  closed: number;
  tokens_per_bead: number | null;
  cache_ratio: number | null;
  rework_rate: number | null;
};
export type MemberUsage = {
  member: string;
  closed: number;
  tokens: number;
  cost: number | null;
  tokens_per_bead: number | null;
  cache_ratio: number | null;
  stages: Record<string, number>;
};
export type Budget = { budget_usd: number; cost: number | null; status: string };
export type EpicUsage = {
  project: string;
  id: string;
  title: string;
  status: string;
  tokens: number;
  cost: number | null;
  children: number;
  closed_children: number;
  budget: Budget | null;
};
export type BeadUsage = {
  project: string;
  id: string;
  title: string;
  issue_type: string;
  assignee: string | null;
  tokens: number;
  cost: number | null;
};
export type StageRow = { stage: string; tokens: number; cost: number | null };
export type ModelRow = {
  model: string;
  role: string;
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
  tokens: number;
  cost: number | null;
};
export type UsageSection = {
  members: MemberUsage[];
  epics: EpicUsage[];
  beads: BeadUsage[];
  stages: StageRow[];
  models: ModelRow[];
};
export type WeekRow = { week: string; counts: Record<string, number> };
export type Stat = { n: number; median: number; p85: number };
export type TimeRow = { key: string; cycle: Stat | null; lead: Stat | null };
export type WipRow = { member: string; count: number };
export type WipBead = { project: string; id: string; title: string; assignee: string | null; age_days: number };
export type EstimateRow = { project: string; id: string; title: string; estimate_days: number; actual_days: number };
export type DeliverySection = {
  weeks: WeekRow[];
  by_type: TimeRow[];
  by_member: TimeRow[];
  overall: TimeRow;
  wip: WipRow[];
  oldest: WipBead[];
  estimates: EstimateRow[];
};
export type Findings = { critical: number; important: number; minor: number; suggestion: number };
export type QualityRow = {
  key: string;
  project: string | null;
  title: string | null;
  beads: number;
  reopens: number;
  bugs: number;
  review_cycles: number;
  rejections: number;
  waivers: number;
  findings: Findings;
  rework_rate: number | null;
};
export type Point = { project: string; id: string; title: string; tokens: number; rework: number };
export type QualitySection = { members: QualityRow[]; epics: QualityRow[]; points: Point[] };
export type CoverageBead = { project: string; id: string; title: string; detail: string };
export type SourceIssue = {
  project: string;
  id: string;
  title: string;
  sources: Record<string, string>;
  skipped_lines: number;
};
export type Coverage = {
  not_collected: CoverageBead[];
  invalid: CoverageBead[];
  unpriced: string[];
  unassigned_share: number | null;
  sources: SourceIssue[];
};
export type ProjectError = { project: string; error: string };
export type Report = {
  generated_at: string;
  project: string;
  days: number;
  sprint: string | null;
  totals: Totals;
  usage: UsageSection;
  delivery: DeliverySection;
  quality: QualitySection;
  coverage: Coverage;
  errors: ProjectError[];
};

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;

const ARRAYS: Record<string, string[]> = {
  usage: ["members", "epics", "beads", "stages", "models"],
  delivery: ["weeks", "by_type", "by_member", "wip", "oldest", "estimates"],
  quality: ["members", "epics", "points"],
  coverage: ["not_collected", "invalid", "unpriced", "sources"],
};

// simplified: checks the shape down to the arrays, not every row; the backend's pydantic model owns the rows.
function isReport(value: unknown): value is Report {
  if (!isObject(value) || typeof field(value, "generated_at") !== "string") return false;
  const totals = field(value, "totals");
  if (!isObject(totals) || typeof field(totals, "tokens") !== "number" || typeof field(totals, "closed") !== "number") {
    return false;
  }
  return (
    Array.isArray(field(value, "errors")) &&
    Object.entries(ARRAYS).every(([section, keys]) => {
      const body = field(value, section);
      return isObject(body) && keys.every((key) => Array.isArray(field(body, key)));
    })
  );
}

async function failure(response: Response): Promise<Error> {
  if (response.status === 404) return new Error("Project not found");
  let detail = `HTTP ${response.status}`;
  try {
    const body: unknown = await response.json();
    const message = isObject(body) ? field(body, "error") : undefined;
    if (typeof message === "string") detail = message;
  } catch {
    // keep the HTTP status
  }
  return new Error(detail);
}

export async function fetchReport(filters: Pick<ReportFilters, "project" | "days" | "sprint">): Promise<Report> {
  const params = new URLSearchParams({ project: filters.project, days: String(filters.days) });
  if (filters.sprint !== "") params.set("sprint", filters.sprint);
  const response = await fetch(`/api/reports?${params.toString()}`);
  if (!response.ok) throw await failure(response);
  const body: unknown = await response.json();
  if (!isReport(body)) throw new Error("Could not load the report (unexpected response)");
  return body;
}
