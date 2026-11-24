import { field } from "@/lib/guards";
import { scopeQuery, type Scope } from "./filters";

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
export type Report = {
  generated_at: string;
  project: string;
  /** the period, or null for a milestone */
  days: number | null;
  milestone: string | null;
  totals: Totals;
  delivery: DeliverySection;
  quality: QualitySection;
};

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;

const ARRAYS: Record<string, string[]> = {
  delivery: ["weeks", "by_type", "by_member", "estimates"],
  quality: ["members", "epics"],
};

const isRate = (value: unknown): boolean => value === null || typeof value === "number";
const hasStrings = (row: object, keys: string[]): boolean => keys.every((key) => typeof field(row, key) === "string");
const hasNumbers = (row: object, keys: string[]): boolean => keys.every((key) => typeof field(row, key) === "number");

function isQualityRow(row: unknown, strings: string[]): boolean {
  return isObject(row) && hasStrings(row, strings) && hasNumbers(row, ["closed", "reopens", "bugs"]) && isRate(field(row, "rework_rate"));
}

function qualityRows(quality: unknown, key: string, strings: string[]): boolean {
  const rows = isObject(quality) ? field(quality, key) : undefined;
  return Array.isArray(rows) && rows.every((row) => isQualityRow(row, strings));
}

// simplified: checks the shape down to the arrays, and the quality rows; the backend's pydantic model owns the other rows.
function isReport(value: unknown): value is Report {
  if (!isObject(value) || typeof field(value, "generated_at") !== "string") return false;
  const totals = field(value, "totals");
  if (!isObject(totals) || typeof field(totals, "closed") !== "number") return false;
  const rate = field(totals, "rework_rate");
  if (!isRate(rate)) return false;
  return (
    Object.entries(ARRAYS).every(([section, keys]) => {
      const body = field(value, section);
      return isObject(body) && keys.every((key) => Array.isArray(field(body, key)));
    }) &&
    qualityRows(field(value, "quality"), "members", ["member"]) &&
    qualityRows(field(value, "quality"), "epics", ["project", "id", "title"])
  );
}

/** A refused report request, with its HTTP status (422 is a bad scope). */
export class ReportRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** The `error` of the answer; a 404 without one is an unknown project. */
export async function failure(response: Response): Promise<ReportRequestError> {
  let detail = response.status === 404 ? "Project not found" : `HTTP ${response.status}`;
  try {
    const body: unknown = await response.json();
    const message = isObject(body) ? field(body, "error") : undefined;
    if (typeof message === "string") detail = message;
  } catch {
    // keep the HTTP status
  }
  return new ReportRequestError(detail, response.status);
}

export async function fetchReport(project: string, scope: Exclude<Scope, { kind: "default" }>): Promise<Report> {
  const params = new URLSearchParams({ project });
  for (const [key, value] of scopeQuery(scope)) params.set(key, value);
  const response = await fetch(`/api/reports?${params.toString()}`);
  if (!response.ok) throw await failure(response);
  const body: unknown = await response.json();
  if (!isReport(body)) throw new Error("Could not load the report (unexpected response)");
  return body;
}
