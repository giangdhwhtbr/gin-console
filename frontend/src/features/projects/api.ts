export type Project = {
  name: string;
  path: string;
  scotty_id: string | null;
  exists: boolean;
};

function isProject(value: unknown): value is Project {
  if (typeof value !== "object" || value === null) return false;
  return (
    "name" in value &&
    typeof value.name === "string" &&
    "path" in value &&
    typeof value.path === "string" &&
    "scotty_id" in value &&
    (typeof value.scotty_id === "string" || value.scotty_id === null) &&
    "exists" in value &&
    typeof value.exists === "boolean"
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
