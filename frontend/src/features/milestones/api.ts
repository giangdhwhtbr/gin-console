import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";
import type { Zoom } from "./gantt";

export type Cause = "outdated" | "tracking" | "schema";
export type MilestoneEntry = {
  id: string;
  title: string;
  status: string;
  start: string;
  end: string;
  kickoff: string | null;
  finish: string | null;
  epics: { total: number; closed: number };
  warnings: number | null;
  error: string | null;
};
export type MilestoneList = { milestones: MilestoneEntry[]; unassigned_epics: number; today: string };
export type EpicWarning = { code: string; days: number | null };
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
const every = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);

function isEntry(value: unknown): value is MilestoneEntry {
  if (!isObject(value)) return false;
  const epics = field(value, "epics");
  return (
    strings(value, ["id", "title", "status", "start", "end"]) &&
    stringsOrNull(value, ["kickoff", "finish", "error"]) &&
    isNumberOrNull(field(value, "warnings")) &&
    isObject(epics) &&
    isFiniteNumber(field(epics, "total")) &&
    isFiniteNumber(field(epics, "closed"))
  );
}

function isList(value: unknown): value is MilestoneList {
  return (
    isObject(value) &&
    every(field(value, "milestones"), isEntry) &&
    isFiniteNumber(field(value, "unassigned_epics")) &&
    isString(field(value, "today"))
  );
}

const isWarning = (value: unknown) =>
  isObject(value) && isString(field(value, "code")) && isNumberOrNull(field(value, "days"));
const isExternal = (value: unknown) =>
  isObject(value) && isString(field(value, "id")) && isStringOrNull(field(value, "milestone"));

function isEpic(value: unknown): value is EpicPlan {
  return (
    isObject(value) &&
    strings(value, ["id", "title", "status", "planned_start", "planned_end"]) &&
    isNumberOrNull(field(value, "estimate_days")) &&
    every(field(value, "depends_on"), isString) &&
    every(field(value, "external_depends_on"), isExternal) &&
    every(field(value, "warnings"), isWarning)
  );
}

function isDetail(value: unknown): value is MilestoneDetail {
  return (
    isObject(value) &&
    strings(value, ["id", "title", "description", "status", "start", "end", "schedule_start", "today"]) &&
    stringsOrNull(value, ["kickoff", "finish"]) &&
    typeof field(value, "preview") === "boolean" &&
    isFiniteNumber(field(value, "overflow_days")) &&
    every(field(value, "epics"), isEpic)
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
  return body;
}

export async function fetchMilestone(project: string, id: string, start: string | null): Promise<MilestoneDetail> {
  const query = start === null ? "" : `?start=${enc(start)}`;
  const response = await fetch(`/api/milestones/${enc(project)}/${enc(id)}${query}`);
  if (!response.ok) throw await failure(response, "Milestone");
  const body: unknown = await response.json();
  if (!isDetail(body)) throw new MilestonesError("Could not load the milestone (unexpected response)");
  return body;
}

export const milestonesPath = (project: string) => `/milestones?project=${enc(project)}`;

export function milestonePath(project: string, id: string, tab: "gantt" | "graph" = "gantt", start: string | null = null, zoom: Zoom = "all") {
  const query = new URLSearchParams();
  if (tab === "graph") query.set("tab", "graph");
  if (start !== null) query.set("start", start);
  if (zoom !== "all") query.set("zoom", zoom);
  const search = query.toString();
  return `/milestones/${enc(project)}/${enc(id)}${search === "" ? "" : `?${search}`}`;
}
