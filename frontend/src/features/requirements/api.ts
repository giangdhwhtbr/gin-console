import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

export type Cause = "outdated" | "schema";
export type Status = "failing" | "building" | "unknown" | "covered" | "untested";
export type SignoffState = "none" | "waived" | "current" | "changed" | "unknown version";
export type Signoff = { state: SignoffState; actor: string | null; at: string | null; change: string | null; evidence: string | null; source: string | null };
export type BeadRef = { id: string; title: string; status: string };
export type CaseRef = { id: string; effective_result: string };
export type ChangeRef = { folder: string; change: string; epic: string | null; op: string; archived: string | null };
export type Requirement = {
  id: string;
  title: string;
  capability: string;
  state: "living" | "proposed" | "removed";
  status: Status | null;
  reasons: string[];
  signoff: Signoff;
  changes: ChangeRef[];
  beads: BeadRef[] | null;
  cases: CaseRef[] | null;
  tests: string[];
};
export type RequirementList = { layout: string; requirements: Requirement[]; warnings: string[]; skipped: string[] };
export type Scenario = { title: string; given: string[]; when: string[]; then: string[] };
export type Scenarios = { id: string; title: string; source: string | null; scenarios: Scenario[] };
export type ChangeFolder = { folder: string; change: string; title: string; epic: string | null; archived: string | null };
export type ChangeRow = ChangeFolder & { signoff: Signoff | null; added: number | null; modified: number | null; removed: number | null };
export type ChangeList = { changes: ChangeRow[]; error: string | null; cause: Cause | null };
export type ChangeContent = ChangeFolder & { files: Record<string, string> };
export type Mockup = { capability: string; date: string; confirmed: string; confirmed_by: string | null; description: string; html: string[]; images: string[]; requirements: string[] };
export type MockupList = { mockups: Mockup[] };

export class RequirementsFailure extends Error {
  readonly kind: Cause | null;
  readonly status: number;
  constructor(message: string, status: number, kind: Cause | null = null) {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const every = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);
const oneOf = (value: unknown, allowed: readonly string[]) => typeof value === "string" && allowed.includes(value);
const isNumberOrNull = (value: unknown) => value === null || isFiniteNumber(value);
const has = (value: object, keys: readonly string[], check: (item: unknown) => boolean) => keys.every((key) => check(field(value, key)));
const CAUSES = ["outdated", "schema"];
const isSignoff = (value: unknown) =>
  isObject(value) && oneOf(field(value, "state"), ["none", "waived", "current", "changed", "unknown version"]) && has(value, ["actor", "at", "change", "evidence", "source"], isStringOrNull);
const isBead = (value: unknown) => isObject(value) && has(value, ["id", "title", "status"], isString);
const isCase = (value: unknown) => isObject(value) && has(value, ["id", "effective_result"], isString);
const isChangeRef = (value: unknown) => isObject(value) && has(value, ["folder", "change", "op"], isString) && has(value, ["epic", "archived"], isStringOrNull);
const isRequirement = (value: unknown) =>
  isObject(value) &&
  has(value, ["id", "title", "capability"], isString) &&
  oneOf(field(value, "state"), ["living", "proposed", "removed"]) &&
  (field(value, "status") === null || oneOf(field(value, "status"), ["failing", "building", "unknown", "covered", "untested"])) &&
  has(value, ["reasons", "tests"], (item) => every(item, isString)) &&
  isSignoff(field(value, "signoff")) &&
  every(field(value, "changes"), isChangeRef) &&
  (field(value, "beads") === null || every(field(value, "beads"), isBead)) &&
  (field(value, "cases") === null || every(field(value, "cases"), isCase));
const isList = (value: unknown): value is RequirementList =>
  isObject(value) && isString(field(value, "layout")) && every(field(value, "requirements"), isRequirement) && has(value, ["warnings", "skipped"], (item) => every(item, isString));
const isScenario = (value: unknown) => isObject(value) && isString(field(value, "title")) && has(value, ["given", "when", "then"], (item) => every(item, isString));
const isScenarios = (value: unknown): value is Scenarios =>
  isObject(value) && has(value, ["id", "title"], isString) && isStringOrNull(field(value, "source")) && every(field(value, "scenarios"), isScenario);
const isFolder = (value: unknown): value is object => isObject(value) && has(value, ["folder", "change", "title"], isString) && has(value, ["epic", "archived"], isStringOrNull);
const isChangeRow = (value: unknown) =>
  isFolder(value) && (field(value, "signoff") === null || isSignoff(field(value, "signoff"))) && has(value, ["added", "modified", "removed"], isNumberOrNull);
const isChanges = (value: unknown): value is ChangeList =>
  isObject(value) && every(field(value, "changes"), isChangeRow) && isStringOrNull(field(value, "error")) && (field(value, "cause") === null || oneOf(field(value, "cause"), CAUSES));
const isContent = (value: unknown): value is ChangeContent => {
  if (!isFolder(value)) return false;
  const files = field(value, "files");
  return isObject(files) && Object.values(files).every(isString);
};
const isMockup = (value: unknown) =>
  isObject(value) && has(value, ["capability", "date", "confirmed", "description"], isString) && isStringOrNull(field(value, "confirmed_by")) && has(value, ["html", "images", "requirements"], (item) => every(item, isString));
const isMockups = (value: unknown): value is MockupList => isObject(value) && every(field(value, "mockups"), isMockup);

async function get<T>(path: string, check: (value: unknown) => value is T): Promise<T> {
  const response = await fetch(path);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = isObject(body) ? field(body, "error") : null;
    const cause = isObject(body) ? field(body, "cause") : null;
    throw new RequirementsFailure(
      typeof error === "string" ? error : `The server answered ${response.status}`,
      response.status,
      cause === "outdated" || cause === "schema" ? cause : null,
    );
  }
  if (!check(body)) throw new RequirementsFailure("unexpected response", response.status);
  return body;
}

const enc = encodeURIComponent;
export const fetchRequirements = (project: string) => get(`/api/requirements?project=${enc(project)}`, isList);
export const fetchScenarios = (project: string, id: string) => get(`/api/requirements/reqs/${enc(project)}/${enc(id)}`, isScenarios);
export const fetchChanges = (project: string) => get(`/api/requirements/changes?project=${enc(project)}`, isChanges);
export const fetchChange = (project: string, folder: string) => get(`/api/requirements/changes/${enc(project)}/${enc(folder)}`, isContent);
export const fetchMockups = (project: string) => get(`/api/requirements/mockups?project=${enc(project)}`, isMockups);
