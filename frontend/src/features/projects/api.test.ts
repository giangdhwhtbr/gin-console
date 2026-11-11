import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProjects, isStale } from "./api";

const beads = (extra: object) => ({ open: 0, in_progress: 0, blocked: 0, ready: 0, epics: [], ...extra });
const project = (b: unknown) => ({ name: "alpha", path: "/p/alpha", exists: true, workflow: null, beads: b });
const stub = (body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(body)))));

afterEach(() => vi.unstubAllGlobals());

describe("fetchProjects stale guard", () => {
  it("REQ-UI-103 accepts a missing stale and a boolean stale", async () => {
    stub([project(beads({})), project(beads({ stale: true })), project(beads({ stale: false })), project(null)]);
    const list = await fetchProjects();
    expect(list.map(isStale)).toEqual([false, true, false, false]);
  });

  it("REQ-UI-103 rejects a stale that is not a boolean", async () => {
    stub([project(beads({ stale: "yes" }))]);
    await expect(fetchProjects()).rejects.toThrow("Could not load projects (unexpected response)");
  });

  it("REQ-UI-103 a beads error is not stale", async () => {
    stub([project({ error: "boom" })]);
    expect((await fetchProjects()).map(isStale)).toEqual([false]);
  });
});
