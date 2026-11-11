import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

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
};
export type Relation = { id: string; title: string; status: string; type: "blocks" | "parent-child" | "discovered-from" };
export type BeadDetail = BeadSummary & {
  description: string | null;
  design: string | null;
  notes: string | null;
  acceptance_criteria: string | null;
  close_reason: string | null;
  dependencies: Relation[];
  dependents: Relation[];
  children: Relation[];
  bugs: Relation[];
};
export type Comment = { id: string; author: string; text: string; created_at: string; truncated: boolean };

export class BeadNotFoundError extends Error {}

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isStringArray = (value: unknown) => Array.isArray(value) && value.every(isString);

function isSummary(value: unknown): value is BeadSummary {
  return (
    isObject(value) &&
    ["id", "title", "status", "issue_type", "created_at", "updated_at"].every((k) => isString(field(value, k))) &&
    ["owner", "assignee", "parent", "closed_at", "created_by"].every((k) => isStringOrNull(field(value, k))) &&
    ["priority", "dependency_count", "dependent_count", "comment_count"].every((k) =>
      isFiniteNumber(field(value, k)),
    ) &&
    ["ready", "blocked"].every((k) => typeof field(value, k) === "boolean") &&
    isStringArray(field(value, "labels")) &&
    isStringArray(field(value, "blocked_by"))
  );
}

function isRelation(value: unknown): value is Relation {
  return (
    isObject(value) &&
    ["id", "title", "status"].every((k) => isString(field(value, k))) &&
    ["blocks", "parent-child", "discovered-from"].includes(String(field(value, "type")))
  );
}

const isRelations = (value: unknown) => Array.isArray(value) && value.every(isRelation);

function isDetail(value: unknown): value is BeadDetail {
  return (
    isSummary(value) &&
    ["description", "design", "notes", "acceptance_criteria", "close_reason"].every((k) =>
      isStringOrNull(field(value, k)),
    ) &&
    ["dependencies", "dependents", "children", "bugs"].every((k) => isRelations(field(value, k)))
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
  return body;
}

export async function fetchBead(project: string, id: string): Promise<BeadDetail> {
  const response = await fetch(`/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);
  if (!response.ok) throw await failure(response, "Bead");
  const body: unknown = await response.json();
  if (!isDetail(body)) throw new Error("Could not load the bead (unexpected response)");
  return body;
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
