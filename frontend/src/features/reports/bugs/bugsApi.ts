import { field, isFiniteNumber, isString } from "@/lib/guards";
import { failure } from "../api";
import { scopeQuery, type Scope } from "../filters";

export type BugPeriod = { start: string; end: string };
export type BugFigures = {
  total: number;
  opened: number;
  closed: number;
  open_now: number;
  oldest_open_days: number | null;
  median_close_days: number | null;
};
export type BugWeek = { start: string; opened: number; closed: number };
export type BugEpic = { id: string | null; title: string | null; opened: number; closed: number; open_now: number };
export type EpicRef = { id: string; title: string };
export type OpenBug = {
  id: string;
  title: string;
  priority: number | null;
  assignee: string | null;
  age_days: number;
  epic: EpicRef | null;
};
export type BugsReport = {
  generated_at: string;
  project: string;
  today: string;
  milestone: string | null;
  days: number | null;
  period: BugPeriod | null;
  figures: BugFigures;
  weeks: BugWeek[];
  epics: BugEpic[];
  open: OpenBug[];
};

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isNullOr = (test: (value: unknown) => boolean) => (value: unknown) => value === null || test(value);
const rowOf = (value: unknown, checks: Readonly<Record<string, (value: unknown) => boolean>>): boolean =>
  isObject(value) && Object.entries(checks).every(([key, test]) => test(field(value, key)));
const rowsOf = (value: unknown, checks: Readonly<Record<string, (value: unknown) => boolean>>): boolean =>
  Array.isArray(value) && value.every((row) => rowOf(row, checks));

const isEpicRef = (value: unknown) => rowOf(value, { id: isString, title: isString });

// simplified: checks every field the section reads; the backend's pydantic model owns the values.
export function isBugsReport(value: unknown): value is BugsReport {
  return rowOf(value, {
    generated_at: isString,
    project: isString,
    today: isString,
    milestone: isNullOr(isString),
    days: isNullOr(isFiniteNumber),
    period: isNullOr((period) => rowOf(period, { start: isString, end: isString })),
    figures: (figures) =>
      rowOf(figures, {
        total: isFiniteNumber,
        opened: isFiniteNumber,
        closed: isFiniteNumber,
        open_now: isFiniteNumber,
        oldest_open_days: isNullOr(isFiniteNumber),
        median_close_days: isNullOr(isFiniteNumber),
      }),
    weeks: (weeks) => rowsOf(weeks, { start: isString, opened: isFiniteNumber, closed: isFiniteNumber }),
    epics: (epics) =>
      rowsOf(epics, { id: isNullOr(isString), title: isNullOr(isString), opened: isFiniteNumber, closed: isFiniteNumber, open_now: isFiniteNumber }),
    open: (open) =>
      rowsOf(open, {
        id: isString,
        title: isString,
        priority: isNullOr(isFiniteNumber),
        assignee: isNullOr(isString),
        age_days: isFiniteNumber,
        epic: isNullOr(isEpicRef),
      }),
  });
}

/** REQ-REPORTS-039: fetches the bugs report for a project and scope. */
export async function fetchBugs(project: string, scope: Scope): Promise<BugsReport> {
  const params = new URLSearchParams({ project });
  if (scope.kind !== "default") for (const [key, value] of scopeQuery(scope)) params.set(key, value);
  const response = await fetch(`/api/reports/bugs?${params.toString()}`);
  if (!response.ok) throw await failure(response);
  const body: unknown = await response.json();
  if (!isBugsReport(body)) throw new Error("Could not load the bugs report (unexpected response)");
  return body;
}
