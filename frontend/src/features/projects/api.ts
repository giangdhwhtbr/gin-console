export type BlockError = { error: string };

export type ReviewWaiver = { task_id: string; reason: string; actor: string };

export type WorkspaceRepo = {
  path: string;
  branch: string | null;
  shape: string | null;
  frozen: boolean;
  present: boolean;
};

// Every field after `gates` is optional: an older backend does not send it
export type Workflow = {
  stage: string;
  layout: string;
  gates: Record<string, string>;
  workspace?: { root: string; repos: WorkspaceRepo[] } | null;
  team?: { enabled: boolean; host: string | null; me: string | null } | null;
  decision?: string | null;
  warnings?: string[];
  remedies?: string[];
  review_waivers?: ReviewWaiver[];
};

export type EpicWorkflow = {
  stage: string;
  gates: Record<string, string>;
  warnings: string[];
  review_waivers: ReviewWaiver[];
};

export type Epic = {
  id: string;
  title: string;
  status?: string;
  workflow?: EpicWorkflow | BlockError | null;
};

export type Beads = {
  open: number;
  in_progress: number;
  blocked: number;
  ready: number;
  /** open prep tasks; absent from an older backend: read as 0 */
  prep?: number;
  epics: Epic[];
  stale?: boolean;
};

export type Project = {
  name: string;
  path: string;
  exists: boolean;
  workflow: Workflow | BlockError | null;
  beads: Beads | BlockError | null;
};

export type ProjectBeads = Pick<Project, "name" | "path" | "exists" | "beads">;

export function isBlockError(value: unknown): value is BlockError {
  return (
    typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
  );
}

const isNullOrObject = (value: unknown) => value === null || (typeof value === "object" && value);

// `stale` is optional in the response; when present it must be a boolean
const hasValidStale = (value: unknown) =>
  typeof value !== "object" || value === null || !("stale" in value) || typeof value.stale === "boolean";

function isProjectBeads(value: unknown): value is ProjectBeads {
  if (typeof value !== "object" || value === null) return false;
  return (
    "name" in value &&
    typeof value.name === "string" &&
    "path" in value &&
    typeof value.path === "string" &&
    "exists" in value &&
    typeof value.exists === "boolean" &&
    "beads" in value &&
    Boolean(isNullOrObject(value.beads)) &&
    hasValidStale(value.beads)
  );
}

function isProject(value: unknown): value is Project {
  return isProjectBeads(value) && "workflow" in value && Boolean(isNullOrObject(value.workflow));
}

export const isStale = (project: Pick<Project, "beads">): boolean =>
  project.beads !== null && !isBlockError(project.beads) && project.beads.stale === true;

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch("/api/projects");
  if (!response.ok) {
    throw new Error(`Could not load projects (HTTP ${response.status})`);
  }
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isProject)) {
    throw new Error("Could not load projects (unexpected response)");
  }
  return body;
}

export async function fetchProjectBeads(): Promise<ProjectBeads[]> {
  const response = await fetch("/api/projects/beads");
  if (!response.ok) {
    throw new Error(`Could not load projects (HTTP ${response.status})`);
  }
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isProjectBeads)) {
    throw new Error("Could not load projects (unexpected response)");
  }
  return body;
}
