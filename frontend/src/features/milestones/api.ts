import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";
import type { Zoom } from "./gantt";

export type DaysPerPoint = { value: number; measured_epics: number; assumed: boolean };
export type Velocity = {
  committed_points: number | null;
  completed_points: number;
  added_points: number;
  say_do: number | null;
  days_per_point: number | null;
  planned_days_per_point: number | null;
  accuracy: number | null;
};
export type EstimateSource = "points" | "days" | "assumed";
export type Cause = "outdated" | "tracking" | "schema";
export type MilestoneEntry = {
  id: string;
  title: string;
  status: string;
  start: string | null;
  end: string | null;
  kickoff: string | null;
  finish: string | null;
  epics: {
    total: number;
    closed: number;
    in_progress?: number;
    blocked?: number;
    ready?: number;
    deferred?: number;
  };
  warnings: number | null;
  error: string | null;
  lanes: number | null;
  velocity: Velocity | null;
};
export type ForecastEpic = { id: string; milestone: string | null; planned_start: string; planned_end: string; estimate_source: EstimateSource | null };
export type Forecast = {
  deadline: string | null;
  lanes: number;
  start: string;
  finish: string | null;
  overflow_days: number;
  open_epics: number;
  unestimated: number;
  error: string | null;
  epics: ForecastEpic[];
};
export type MilestoneList = { milestones: MilestoneEntry[]; unassigned_epics: number; today: string; forecast: Forecast | null; days_per_point: DaysPerPoint | null };
export type EpicWarning = { code: string; days: number | null; count: number | null };
export type ExternalDependency = { id: string; milestone: string | null };
export type EpicPlan = {
  id: string;
  title: string;
  status: string;
  estimate_days: number | null;
  planned_start: string;
  planned_end: string;
  depends_on: string[];
  external_depends_on: ExternalDependency[];
  warnings: EpicWarning[];
  spec_confirmed: boolean | null;
  remaining_days: number | null;
  assumed_days: number | null;
  points: number | null;
  points_reason: string | null;
  estimate_source: EstimateSource | null;
  actual_days: number | null;
  actual_days_per_point: number | null;
};
export type MilestoneDetail = {
  id: string;
  title: string;
  description: string;
  status: string;
  start: string;
  end: string;
  kickoff: string | null;
  schedule_start: string;
  preview: boolean;
  today: string;
  finish: string | null;
  overflow_days: number;
  epics: EpicPlan[];
  lanes: number | null;
  integration: string | null;
  deadline: string | null;
  away: Record<string, string[]>;
  days_per_point: DaysPerPoint | null;
  velocity: Velocity | null;
};

/** A failed milestones request; `kind` names a known cause the page explains with its fix. */
export class MilestonesError extends Error {
  readonly kind: Cause | null;
  constructor(message: string, kind: Cause | null = null) {
    super(message);
    this.kind = kind;
  }
}

const CAUSES: readonly string[] = ["outdated", "tracking", "schema"];
const isCause = (value: unknown): value is Cause => typeof value === "string" && CAUSES.includes(value);
const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const strings = (value: object, keys: readonly string[]) => keys.every((k) => isString(field(value, k)));
const stringsOrNull = (value: object, keys: readonly string[]) => keys.every((k) => isStringOrNull(field(value, k)));
const isNumberOrNull = (value: unknown) => value === null || isFiniteNumber(value);
const isLanes = (value: unknown) => value === undefined || isNumberOrNull(value);
const isAway = (value: unknown) =>
  value === undefined || (isObject(value) && Object.values(value).every((ranges) => every(ranges, isString)));
const every = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);

const numberOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const stringOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** REQ-MILESTONE-UI-008: gin's `velocity`; a missing or malformed one reads as null, never as a page error. */
export function velocityOf(value: unknown): Velocity | null {
  if (!isObject(value)) return null;
  const completed = numberOrNull(field(value, "completed_points"));
  const added = numberOrNull(field(value, "added_points"));
  if (completed === null || added === null) return null;
  return {
    committed_points: numberOrNull(field(value, "committed_points")),
    completed_points: completed,
    added_points: added,
    say_do: numberOrNull(field(value, "say_do")),
    days_per_point: numberOrNull(field(value, "days_per_point")),
    planned_days_per_point: numberOrNull(field(value, "planned_days_per_point")),
    accuracy: numberOrNull(field(value, "accuracy")),
  };
}

export function daysPerPointOf(value: unknown): DaysPerPoint | null {
  if (!isObject(value)) return null;
  const number = numberOrNull(field(value, "value"));
  if (number === null) return null;
  return {
    value: number,
    measured_epics: numberOrNull(field(value, "measured_epics")) ?? 0,
    assumed: field(value, "assumed") === true,
  };
}

const sourceOf = (value: unknown): EstimateSource | null => (value === "points" || value === "days" || value === "assumed" ? value : null);

const isForecastEpic = (value: unknown) =>
  isObject(value) &&
  strings(value, ["id", "planned_start", "planned_end"]) &&
  isStringOrNull(field(value, "milestone")) &&
  (field(value, "estimate_source") === undefined || isStringOrNull(field(value, "estimate_source")));

function isForecast(value: unknown): value is Forecast {
  return (
    isObject(value) &&
    isString(field(value, "start")) &&
    stringsOrNull(value, ["deadline", "finish", "error"]) &&
    ["lanes", "overflow_days", "open_epics", "unestimated"].every((k) => isFiniteNumber(field(value, k))) &&
    (field(value, "epics") === undefined || every(field(value, "epics"), isForecastEpic))
  );
}

/** REQ-MILESTONE-UI-008: an older gin has no `epics` in its forecast, and an epic may lack `estimate_source`; both read as empty or null. */
function withEpics(forecast: Forecast | null): Forecast | null {
  if (forecast === null) return null;
  const epics = field(forecast, "epics");
  return {
    ...forecast,
    epics: Array.isArray(epics)
      ? epics.map((e: ForecastEpic) => ({ ...e, milestone: e.milestone ?? null, estimate_source: sourceOf(field(e, "estimate_source")) }))
      : [],
  };
}

function isEntry(value: unknown): value is MilestoneEntry {
  if (!isObject(value)) return false;
  const epics = field(value, "epics");
  return (
    strings(value, ["id", "title", "status"]) &&
    stringsOrNull(value, ["start", "end", "kickoff", "finish", "error"]) &&
    isNumberOrNull(field(value, "warnings")) &&
    isObject(epics) &&
    isFiniteNumber(field(epics, "total")) &&
    isFiniteNumber(field(epics, "closed")) &&
    ["in_progress", "blocked", "ready", "deferred"].every((k) => {
      const n = field(epics, k);
      return n === undefined || isFiniteNumber(n);
    }) &&
    isLanes(field(value, "lanes"))
  );
}

function isList(value: unknown): value is MilestoneList {
  return (
    isObject(value) &&
    every(field(value, "milestones"), isEntry) &&
    isFiniteNumber(field(value, "unassigned_epics")) &&
    isString(field(value, "today")) &&
    (field(value, "forecast") === undefined || field(value, "forecast") === null || isForecast(field(value, "forecast")))
  );
}

const isWarning = (value: unknown) =>
  isObject(value) && isString(field(value, "code")) && isNumberOrNull(field(value, "days")) && isLanes(field(value, "count"));
const isExternal = (value: unknown) =>
  isObject(value) && isString(field(value, "id")) && isStringOrNull(field(value, "milestone"));

const isSpecConfirmed = (value: unknown) => value === undefined || value === null || typeof value === "boolean";

function isEpic(value: unknown): value is EpicPlan {
  return (
    isObject(value) &&
    strings(value, ["id", "title", "status", "planned_start", "planned_end"]) &&
    isNumberOrNull(field(value, "estimate_days")) &&
    every(field(value, "depends_on"), isString) &&
    every(field(value, "external_depends_on"), isExternal) &&
    every(field(value, "warnings"), isWarning) &&
    isSpecConfirmed(field(value, "spec_confirmed")) &&
    isLanes(field(value, "remaining_days")) &&
    isLanes(field(value, "assumed_days"))
  );
}

function isDetail(value: unknown): value is MilestoneDetail {
  return (
    isObject(value) &&
    strings(value, ["id", "title", "description", "status", "start", "end", "schedule_start", "today"]) &&
    stringsOrNull(value, ["kickoff", "finish"]) &&
    typeof field(value, "preview") === "boolean" &&
    isFiniteNumber(field(value, "overflow_days")) &&
    every(field(value, "epics"), isEpic) &&
    isLanes(field(value, "lanes")) &&
    ["integration", "deadline"].every((k) => field(value, k) === undefined || isStringOrNull(field(value, k))) &&
    isAway(field(value, "away"))
  );
}

async function failure(response: Response, what: string): Promise<MilestonesError> {
  if (response.status === 404) return new MilestonesError(`${what} not found`);
  try {
    const body: unknown = await response.json();
    const message = isObject(body) ? field(body, "error") : undefined;
    if (typeof message === "string") {
      const cause = isObject(body) ? field(body, "cause") : null;
      return new MilestonesError(message, isCause(cause) ? cause : null);
    }
  } catch {
    // keep the HTTP status
  }
  return new MilestonesError(`HTTP ${response.status}`);
}

const enc = encodeURIComponent;

export async function fetchMilestones(project: string): Promise<MilestoneList> {
  const response = await fetch(`/api/milestones?project=${enc(project)}`);
  if (!response.ok) throw await failure(response, "Project");
  const body: unknown = await response.json();
  if (!isList(body)) throw new MilestonesError("Could not load milestones (unexpected response)");
  return {
    ...body,
    forecast: withEpics(body.forecast ?? null),
    days_per_point: daysPerPointOf(field(body, "days_per_point")),
    milestones: body.milestones.map((m) => ({ ...m, lanes: m.lanes ?? null, velocity: velocityOf(field(m, "velocity")) })),
  };
}

export async function fetchMilestone(project: string, id: string, start: string | null): Promise<MilestoneDetail> {
  const query = start === null ? "" : `?start=${enc(start)}`;
  const response = await fetch(`/api/milestones/${enc(project)}/${enc(id)}${query}`);
  if (!response.ok) throw await failure(response, "Milestone");
  const body: unknown = await response.json();
  if (!isDetail(body)) throw new MilestonesError("Could not load the milestone (unexpected response)");
  return {
    ...body,
    lanes: body.lanes ?? null,
    integration: body.integration ?? null,
    deadline: body.deadline ?? null,
    away: body.away ?? {},
    days_per_point: daysPerPointOf(field(body, "days_per_point")),
    velocity: velocityOf(field(body, "velocity")),
    epics: body.epics.map((e) => ({
      ...e,
      spec_confirmed: e.spec_confirmed ?? null,
      remaining_days: e.remaining_days ?? null,
      assumed_days: e.assumed_days ?? null,
      points: numberOrNull(field(e, "points")),
      points_reason: stringOrNull(field(e, "points_reason")),
      estimate_source: sourceOf(field(e, "estimate_source")),
      actual_days: numberOrNull(field(e, "actual_days")),
      actual_days_per_point: numberOrNull(field(e, "actual_days_per_point")),
      warnings: e.warnings.map((w) => ({ ...w, count: w.count ?? null })),
    })),
  };
}

export const milestonesPath = (project: string) => `/milestones?project=${enc(project)}`;

export type MilestoneTab = "gantt" | "beads" | "retro";

/** `extra`: a Beads filters query (with or without "?"), merged after tab, start and zoom; its `project` and `milestone` are dropped. */
export function milestonePath(project: string, id: string, tab: MilestoneTab = "gantt", start: string | null = null, zoom: Zoom = "all", extra = "") {
  const query = new URLSearchParams();
  if (tab !== "gantt") query.set("tab", tab);
  if (start !== null) query.set("start", start);
  if (zoom !== "all") query.set("zoom", zoom);
  new URLSearchParams(extra).forEach((value, key) => {
    if (key !== "project" && key !== "milestone") query.append(key, value);
  });
  const search = query.toString();
  return `/milestones/${enc(project)}/${enc(id)}${search === "" ? "" : `?${search}`}`;
}
