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

export type Block = {
  type: "text" | "thinking" | "tool_use" | "tool_result";
  text: string | null;
  name: string | null;
  input: string | null;
  truncated: boolean;
};
export type Message = { role: "user" | "assistant"; blocks: Block[] };
export type MessagePage = { items: Message[]; next_offset: number | null };

export class SessionNotFoundError extends Error {}

const BLOCK_TYPES = ["text", "thinking", "tool_use", "tool_result"];

function isBlock(value: unknown): value is Block {
  if (typeof value !== "object" || value === null) return false;
  return (
    BLOCK_TYPES.includes(String(field(value, "type"))) &&
    ["text", "name", "input"].every((k) => isStringOrNull(field(value, k))) &&
    typeof field(value, "truncated") === "boolean"
  );
}

function isMessage(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) return false;
  const blocks = field(value, "blocks");
  return (
    ["user", "assistant"].includes(String(field(value, "role"))) &&
    Array.isArray(blocks) &&
    blocks.every(isBlock)
  );
}

export async function fetchMessages(project: string, id: string, offset: number): Promise<MessagePage> {
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(project)}/${encodeURIComponent(id)}/messages?offset=${offset}`,
  );
  if (response.status === 404) throw new SessionNotFoundError("Session not found");
  if (!response.ok) throw new Error(`Could not load messages (HTTP ${response.status})`);
  const body: unknown = await response.json();
  const items = typeof body === "object" && body !== null ? field(body, "items") : undefined;
  const next = typeof body === "object" && body !== null ? field(body, "next_offset") : undefined;
  if (!Array.isArray(items) || !items.every(isMessage) || !(next === null || typeof next === "number")) {
    throw new Error("Could not load messages (unexpected response)");
  }
  return { items, next_offset: next };
}

