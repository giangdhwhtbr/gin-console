import { field } from "@/lib/guards";
import type { ReportFilters } from "./filters";

export type Totals = { closed: number; rework_rate: number | null };
export type WeekRow = { week: string; counts: Record<string, number> };
export type Stat = { n: number; median: number; p85: number };
export type TimeRow = { key: string; cycle: Stat | null; lead: Stat | null };
export type EstimateRow = { project: string; id: string; title: string; estimate_days: number | null; points: number | null; actual_days: number; days_per_point: number | null };
export type DeliverySection = {
  weeks: WeekRow[];
  by_type: TimeRow[];
  by_member: TimeRow[];
  overall: TimeRow;
  estimates: EstimateRow[];
};
export type MemberQuality = { member: string; closed: number; reopens: number; bugs: number; rework_rate: number | null };
export type EpicQuality = { project: string; id: string; title: string; closed: number; reopens: number; bugs: number; rework_rate: number | null };
export type QualitySection = { members: MemberQuality[]; epics: EpicQuality[] };
export type ProjectError = { project: string; error: string };
export type Report = {
  generated_at: string;
  project: string;
  days: number;
  sprint: string | null;
  totals: Totals;
  delivery: DeliverySection;
  quality: QualitySection;
  errors: ProjectError[];
};

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;

const ARRAYS: Record<string, string[]> = {
  delivery: ["weeks", "by_type", "by_member", "estimates"],
  quality: ["members", "epics"],
};

// simplified: checks the shape down to the arrays, not every row; the backend's pydantic model owns the rows.
function isReport(value: unknown): value is Report {
  if (!isObject(value) || typeof field(value, "generated_at") !== "string") return false;
  const totals = field(value, "totals");
  if (!isObject(totals) || typeof field(totals, "closed") !== "number") return false;
  const rate = field(totals, "rework_rate");
  if (rate !== null && typeof rate !== "number") return false;
  return (
    Array.isArray(field(value, "errors")) &&
    Object.entries(ARRAYS).every(([section, keys]) => {
      const body = field(value, section);
      return isObject(body) && keys.every((key) => Array.isArray(field(body, key)));
    })
  );
}

export async function failure(response: Response): Promise<Error> {
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
