export type BlockError = { error: string };

export type Workflow = {
  stage: string;
  layout: string;
  gates: Record<string, string>;
};

export type Beads = {
  open: number;
  in_progress: number;
  blocked: number;
  ready: number;
  epics: { id: string; title: string }[];
};

export type Project = {
  name: string;
  path: string;
  scotty_id: string | null;
  scotty_url: string | null;
  exists: boolean;
  workflow: Workflow | BlockError | null;
  beads: Beads | BlockError | null;
};

export function isBlockError(value: unknown): value is BlockError {
  return (
    typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
  );
}

const isNullOrObject = (value: unknown) => value === null || (typeof value === "object" && value);

function isProject(value: unknown): value is Project {
  if (typeof value !== "object" || value === null) return false;
  return (
    "name" in value &&
    typeof value.name === "string" &&
    "path" in value &&
    typeof value.path === "string" &&
    "scotty_id" in value &&
    (typeof value.scotty_id === "string" || value.scotty_id === null) &&
    "scotty_url" in value &&
    (typeof value.scotty_url === "string" || value.scotty_url === null) &&
    "exists" in value &&
    typeof value.exists === "boolean" &&
    "workflow" in value &&
    Boolean(isNullOrObject(value.workflow)) &&
    "beads" in value &&
    Boolean(isNullOrObject(value.beads))
  );
}

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
