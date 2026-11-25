import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

export type Blocker = { id: string; title: string; person: string; blocked: boolean };
export type Named = { id: string; title: string };
export type ActiveBead = Named & { assignee: string | null };
export type AgingBead = ActiveBead & { days: number };
export type BlockedBead = AgingBead & { blocker: Blocker | null };
export type ReadyBead = Named & { priority: number | null };
export type ProjectOverview = {
  name: string;
  error: string | null;
  stale: boolean;
  milestone: Named | null;
  blocked: BlockedBead[];
  aging: AgingBead[];
  unassigned: ReadyBead[];
  in_progress: ActiveBead[];
  epics: Named[];
};
export type Overview = { generated_at: string; aging_days: number; projects: ProjectOverview[] };

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isNamed = (value: unknown): value is object => isObject(value) && isString(field(value, "id")) && isString(field(value, "title"));
const isActive = (value: unknown): value is object => isNamed(value) && isStringOrNull(field(value, "assignee"));
const isAging = (value: unknown): value is object => isActive(value) && isFiniteNumber(field(value, "days"));
const isBlocker = (value: unknown) => value === null || (isNamed(value) && isString(field(value, "person")));
const isBlocked = (value: unknown) => isAging(value) && isBlocker(field(value, "blocker"));
const isReady = (value: unknown) => isNamed(value) && (field(value, "priority") === null || isFiniteNumber(field(value, "priority")));
const every = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);

function isProject(value: unknown): boolean {
  return (
    isObject(value) &&
    isString(field(value, "name")) &&
    isStringOrNull(field(value, "error")) &&
    typeof field(value, "stale") === "boolean" &&
    (field(value, "milestone") === null || isNamed(field(value, "milestone"))) &&
    every(field(value, "blocked"), isBlocked) &&
    every(field(value, "aging"), isAging) &&
    every(field(value, "unassigned"), isReady) &&
    every(field(value, "in_progress"), isActive) &&
    every(field(value, "epics"), isNamed)
  );
}

function isOverview(value: unknown): value is Overview {
  return isObject(value) && isString(field(value, "generated_at")) && isFiniteNumber(field(value, "aging_days")) && every(field(value, "projects"), isProject);
}

export async function fetchOverview(): Promise<Overview> {
  const response = await fetch("/api/overview");
  if (!response.ok) throw new Error(`Could not load the overview (HTTP ${response.status})`);
  const body: unknown = await response.json();
  if (!isOverview(body)) throw new Error("Could not load the overview (unexpected response)");
  return body;
}
