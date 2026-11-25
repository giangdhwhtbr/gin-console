import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOverview } from "./api";

const project = {
  name: "a",
  error: null,
  stale: false,
  milestone: { id: "m-1", title: "M1" },
  blocked: [{ id: "a-1", title: "T", assignee: null, days: 3, blocker: { id: "a-2", title: "U", person: "bob", blocked: false } }],
  aging: [{ id: "a-3", title: "T", assignee: "x@y.z", days: 9 }],
  unassigned: [{ id: "a-4", title: "T", priority: null }],
  in_progress: [{ id: "a-5", title: "T", assignee: "x" }],
  epics: [{ id: "a-6", title: "E" }],
};

function reply(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchOverview", () => {
  it("REQ-OVERVIEW-001 returns a valid body", async () => {
    const body = { generated_at: "2026-11-25T00:00:00Z", aging_days: 7, projects: [project] };
    reply(body);
    await expect(fetchOverview()).resolves.toEqual(body);
    expect(fetch).toHaveBeenCalledWith("/api/overview");
  });

  it("REQ-OVERVIEW-001 rejects a malformed body", async () => {
    reply({ generated_at: "x", aging_days: 7, projects: [{ ...project, aging: [{ id: "a" }] }] });
    await expect(fetchOverview()).rejects.toThrow("unexpected response");
  });

  it("REQ-OVERVIEW-010 rejects an HTTP error", async () => {
    reply({}, 502);
    await expect(fetchOverview()).rejects.toThrow("HTTP 502");
  });
});
