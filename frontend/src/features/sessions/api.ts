export type SessionSummary = {
  id: string;
  project: string;
  title: string;
  cwd: string | null;
  modified: string;
  size: number;
  live: boolean;
  name: string | null;
  status: string | null;
  kind: string | null;
  resume_command: string;
};

// Reflect.get keeps the guards free of type assertions; the result is checked before use.
const field = (value: object, key: string): unknown => Reflect.get(value, key);
const isString = (value: unknown) => typeof value === "string";
const isStringOrNull = (value: unknown) => value === null || typeof value === "string";

function isSession(value: unknown): value is SessionSummary {
  if (typeof value !== "object" || value === null) return false;
  return (
    ["id", "project", "title", "modified", "resume_command"].every((k) => isString(field(value, k))) &&
    ["cwd", "name", "status", "kind"].every((k) => isStringOrNull(field(value, k))) &&
    typeof field(value, "size") === "number" &&
    typeof field(value, "live") === "boolean"
  );
}

export async function fetchSessions(project?: string): Promise<SessionSummary[]> {
  const query = project === undefined ? "" : `?project=${encodeURIComponent(project)}`;
  const response = await fetch(`/api/sessions${query}`);
  if (!response.ok) {
    throw new Error(`Could not load sessions (HTTP ${response.status})`);
  }
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isSession)) {
    throw new Error("Could not load sessions (unexpected response)");
  }
  return body;
}
