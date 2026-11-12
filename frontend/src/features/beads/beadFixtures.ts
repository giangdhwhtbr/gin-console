import { vi } from "vitest";
import type { ProjectBeads } from "@/features/projects/api";
import type { BeadSummary } from "./api";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const bead = (id: string, overrides: Partial<BeadSummary> = {}): BeadSummary => ({
  id,
  title: `Title ${id}`,
  status: "open",
  priority: 2,
  issue_type: "task",
  labels: [],
  owner: null,
  assignee: null,
  parent: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-10T00:00:00Z",
  dependency_count: 0,
  dependent_count: 0,
  comment_count: 0,
  closed_at: null,
  ready: false,
  blocked: false,
  created_by: null,
  blocked_by: [],
  ...overrides,
});

export const project = (name: string, exists = true): ProjectBeads => ({
  name,
  path: `/home/gin/${name}`,
  exists,
  beads: null,
});

/** Stub `fetch` for `/api/projects` (the given names exist) and `/api/beads` (the handler decides). */
export function stubBeads(
  handler: (url: URL) => Response | Promise<Response>,
  names: string[] = ["alpha"],
) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(text, "http://localhost");
    if (url.pathname === "/api/projects/beads") return Promise.resolve(json(names.map((n) => project(n))));
    if (url.pathname === "/api/beads") return Promise.resolve(handler(url));
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
