import type { EpicWorkflow } from "@/features/projects/api";
import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

export type BeadKind = "capability" | "technical" | "parity";
export type BeadComplexity = "low" | "medium" | "high";
export type TrackRef = { plan: string | null; number: number };
export type GateRef = { plan: string; number: number; track_id: string | null; lane: string | null };
export type Claim = { holder: string; expires_at: string };
export type ChildCounts = {
  total: number;
  closed: number;
  prep_total: number;
  prep_closed: number;
  in_progress?: number;
  blocked?: number;
  ready?: number;
  deferred?: number;
};
export type BeadImage = { n: number; path: string; caption: string; available: boolean };
export type BeadSummary = {
  id: string;
  title: string;
  status: string;
  priority: number;
  issue_type: string;
  labels: string[];
  owner: string | null;
  assignee: string | null;
  parent: string | null;
  created_at: string;
  updated_at: string;
  dependency_count: number;
  dependent_count: number;
  comment_count: number;
  ready: boolean;
  blocked: boolean;
  created_by: string | null;
  blocked_by: string[];
  closed_at: string | null;
  milestone: string | null;
  kind: BeadKind | null;
  capabilities: string[];
  complexity: BeadComplexity | null;
  estimate_minutes: number | null;
  points: number | null;
  points_reason: string | null;
  lane: string | null;
  track: TrackRef | null;
  claim: Claim | null;
  waits_for: GateRef | null;
  child_counts: ChildCounts;
  image_count?: number;
};
export type MilestoneStatus = "active" | "scheduled" | "planned" | "closed";
export type MilestoneOption = {
  id: string;
  title: string;
  status: MilestoneStatus;
  start: string | null;
  end: string | null;
};
export type ProjectMilestones = { milestones: MilestoneOption[]; current: string | null };
export type Relation = {
  id: string;
  title: string;
  status: string;
  type: "blocks" | "parent-child" | "discovered-from";
  waits_for?: GateRef | null;
};
export type Child = Relation & { prep: boolean };
export type BeadDetail = BeadSummary & {
  description: string | null;
  design: string | null;
  notes: string | null;
  acceptance_criteria: string | null;
  close_reason: string | null;
  dependencies: Relation[];
  dependents: Relation[];
  children: Child[];
  bugs: Relation[];
  images?: BeadImage[];
};
export type Comment = { id: string; author: string; text: string; created_at: string; truncated: boolean };

/** The address of image `n` of a bead (REQ-BEADS-028); the browser never sends a path. */
export const imageUrl = (project: string, id: string, n: number): string =>
  `/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}/images/${n}`;

export class BeadNotFoundError extends Error {}

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isStringOrUndefined = (value: unknown) => value === undefined || isStringOrNull(value);
const isStringArray = (value: unknown) => Array.isArray(value) && value.every(isString);
const isMissingOr = (value: unknown, ok: (v: unknown) => boolean) => value === undefined || value === null || ok(value);
const isTrackRef = (value: unknown) =>
  isObject(value) && isMissingOr(field(value, "plan"), isString) && isFiniteNumber(field(value, "number"));
const isClaim = (value: unknown) =>
  isObject(value) && isString(field(value, "holder")) && isString(field(value, "expires_at"));
const isGateRef = (value: unknown) =>
  isObject(value) &&
  isString(field(value, "plan")) &&
  isFiniteNumber(field(value, "number")) &&
  isMissingOr(field(value, "track_id"), isString) &&
  isMissingOr(field(value, "lane"), isString);
const KINDS: readonly BeadKind[] = ["capability", "technical", "parity"];
const COMPLEXITIES: readonly BeadComplexity[] = ["low", "medium", "high"];

const isChildCounts = (value: unknown): value is ChildCounts =>
  isObject(value) &&
  ["total", "closed", "prep_total", "prep_closed"].every((k) => isFiniteNumber(field(value, k))) &&
  ["in_progress", "blocked", "ready", "deferred"].every((k) => {
    const n = field(value, k);
    return n === undefined || isFiniteNumber(n);
  });

function isSummary(value: unknown): value is BeadSummary {
  return (
    isObject(value) &&
    ["id", "title", "status", "issue_type", "created_at", "updated_at"].every((k) => isString(field(value, k))) &&
    ["owner", "assignee", "parent", "closed_at", "created_by"].every((k) => isStringOrNull(field(value, k))) &&
    isStringOrUndefined(field(value, "milestone")) &&
    ["priority", "dependency_count", "dependent_count", "comment_count"].every((k) =>
      isFiniteNumber(field(value, k)),
    ) &&
    ["ready", "blocked"].every((k) => typeof field(value, k) === "boolean") &&
    isStringArray(field(value, "labels")) &&
    isStringArray(field(value, "blocked_by")) &&
    isChildCounts(field(value, "child_counts")) &&
    isMissingOr(field(value, "kind"), isString) &&
    isMissingOr(field(value, "capabilities"), isStringArray) &&
    isMissingOr(field(value, "complexity"), isString) &&
    isMissingOr(field(value, "estimate_minutes"), isFiniteNumber) &&
    isMissingOr(field(value, "lane"), isString) &&
    isMissingOr(field(value, "track"), isTrackRef) &&
    isMissingOr(field(value, "claim"), isClaim) &&
    isMissingOr(field(value, "waits_for"), isGateRef) &&
    isMissingOr(field(value, "image_count"), isFiniteNumber)
  );
}

const MILESTONE_STATUSES: readonly unknown[] = ["active", "scheduled", "planned", "closed"];

function isMilestoneOption(value: unknown): value is MilestoneOption {
  return (
    isObject(value) &&
    ["id", "title"].every((k) => isString(field(value, k))) &&
    MILESTONE_STATUSES.includes(field(value, "status")) &&
    ["start", "end"].every((k) => isStringOrNull(field(value, k)))
  );
}

function isProjectMilestones(value: unknown): value is ProjectMilestones {
  if (!isObject(value)) return false;
  const milestones = field(value, "milestones");
  return Array.isArray(milestones) && milestones.every(isMilestoneOption) && isStringOrNull(field(value, "current"));
}

/** An answer from before `milestone`, `kind` or the estimate fields existed lacks those keys, and an unknown kind or complexity reads as empty. */
const withMilestone = <T extends BeadSummary>(bead: T): T => ({
  ...bead,
  milestone: bead.milestone ?? null,
  kind: KINDS.find((k) => k === bead.kind) ?? null,
  capabilities: bead.capabilities ?? [],
  complexity: COMPLEXITIES.find((c) => c === bead.complexity) ?? null,
  estimate_minutes: bead.estimate_minutes ?? null,
  // a malformed points or reason reads as none, it never fails the list
  points: typeof bead.points === "number" && Number.isFinite(bead.points) ? bead.points : null,
  points_reason: typeof bead.points_reason === "string" ? bead.points_reason : null,
  lane: bead.lane ?? null,
  track: bead.track ?? null,
  claim: bead.claim ?? null,
  waits_for: bead.waits_for ?? null,
});

function isRelation(value: unknown): value is Relation {
  return (
    isObject(value) &&
    ["id", "title", "status"].every((k) => isString(field(value, k))) &&
    ["blocks", "parent-child", "discovered-from"].includes(String(field(value, "type"))) &&
    isMissingOr(field(value, "waits_for"), isGateRef)
  );
}

const isRelations = (value: unknown) => Array.isArray(value) && value.every(isRelation);
const isChildren = (value: unknown) =>
  Array.isArray(value) && value.every((c) => isRelation(c) && typeof field(c, "prep") === "boolean");

const isBeadImage = (value: unknown) =>
  isObject(value) &&
  isFiniteNumber(field(value, "n")) &&
  isString(field(value, "path")) &&
  isString(field(value, "caption")) &&
  typeof field(value, "available") === "boolean";

function isDetail(value: unknown): value is BeadDetail {
  return (
    isSummary(value) &&
    ["description", "design", "notes", "acceptance_criteria", "close_reason"].every((k) =>
      isStringOrNull(field(value, k)),
    ) &&
    ["dependencies", "dependents", "bugs"].every((k) => isRelations(field(value, k))) &&
    isChildren(field(value, "children")) &&
    isMissingOr(field(value, "images"), (images) => Array.isArray(images) && images.every(isBeadImage))
  );
}

function isComment(value: unknown): value is Comment {
  return (
    isObject(value) &&
    ["id", "author", "text", "created_at"].every((k) => isString(field(value, k))) &&
    typeof field(value, "truncated") === "boolean"
  );
}

async function failure(response: Response, what: string): Promise<Error> {
  if (response.status === 404) return new BeadNotFoundError(`${what} not found`);
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

export async function fetchBeads(project: string, closed: boolean): Promise<BeadSummary[]> {
  const response = await fetch(`/api/beads?project=${encodeURIComponent(project)}${closed ? "&closed=1" : ""}`);
  if (!response.ok) throw await failure(response, "Project");
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isSummary)) {
    throw new Error("Could not load beads (unexpected response)");
  }
  return body.map(withMilestone);
}

export async function fetchMilestones(project: string): Promise<ProjectMilestones> {
  const response = await fetch(`/api/beads/milestones?project=${encodeURIComponent(project)}`);
  if (!response.ok) throw await failure(response, "Project");
  const body: unknown = await response.json();
  if (!isProjectMilestones(body)) throw new Error("Could not load milestones (unexpected response)");
  return body;
}

export async function fetchBead(project: string, id: string): Promise<BeadDetail> {
  const response = await fetch(`/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);
  if (!response.ok) throw await failure(response, "Bead");
  const body: unknown = await response.json();
  if (!isDetail(body)) throw new Error("Could not load the bead (unexpected response)");
  return withMilestone(body);
}

export async function fetchComments(project: string, id: string): Promise<Comment[]> {
  const response = await fetch(
    `/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}/comments`,
  );
  if (!response.ok) throw await failure(response, "Bead");
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isComment)) {
    throw new Error("Could not load the comments (unexpected response)");
  }
  return body;
}

const isWaiver = (value: unknown) => isObject(value) && ["task_id", "reason", "actor"].every((k) => isString(field(value, k)));

function isEpicWorkflow(value: unknown): value is EpicWorkflow {
  if (!isObject(value)) return false;
  const gates = field(value, "gates");
  const waivers = field(value, "review_waivers");
  return (
    isString(field(value, "stage")) &&
    isObject(gates) &&
    Object.values(gates).every(isString) &&
    isStringArray(field(value, "warnings")) &&
    Array.isArray(waivers) &&
    waivers.every(isWaiver)
  );
}

/** REQ-BEADS-020: the stage, gates, warnings and review waivers of an epic; a 502 throws the server's `error`. */
export async function fetchEpicWorkflow(project: string, id: string): Promise<EpicWorkflow> {
  const response = await fetch(`/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}/workflow`);
  if (!response.ok) throw await failure(response, "Bead");
  const body: unknown = await response.json();
  if (!isEpicWorkflow(body)) throw new Error("Could not load the workflow (unexpected response)");
  return body;
}
