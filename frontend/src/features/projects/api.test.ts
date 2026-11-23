import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProjectBeads, isStale, pullOf } from "./api";

const beads = (extra: object) => ({ open: 0, in_progress: 0, blocked: 0, ready: 0, epics: [], ...extra });
const project = (b: unknown) => ({ name: "alpha", path: "/p/alpha", exists: true, beads: b });
const stub = (body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(body)))));

afterEach(() => vi.unstubAllGlobals());

describe("fetchProjectBeads stale guard", () => {
  it("REQ-UI-103 accepts a missing stale and a boolean stale", async () => {
    stub([project(beads({})), project(beads({ stale: true })), project(beads({ stale: false })), project(null)]);
    const list = await fetchProjectBeads();
    expect(list.map(isStale)).toEqual([false, true, false, false]);
  });

  it("REQ-UI-103 rejects a stale that is not a boolean", async () => {
    stub([project(beads({ stale: "yes" }))]);
    await expect(fetchProjectBeads()).rejects.toThrow("Could not load projects (unexpected response)");
  });

  it("REQ-UI-103 a beads error is not stale", async () => {
    stub([project({ error: "boom" })]);
    expect((await fetchProjectBeads()).map(isStale)).toEqual([false]);
  });

  it("REQ-SERVER-006 accepts epics with and without status and workflow", async () => {
    const epics = [
      { id: "e-1", title: "t", status: "in_progress", workflow: { stage: "execute", gates: {}, warnings: [], review_waivers: [] } },
      { id: "e-2", title: "t", status: "in_progress", workflow: { error: "boom" } },
      { id: "e-3", title: "t" },
    ];
    stub([project(beads({ epics }))]);
    expect(await fetchProjectBeads()).toHaveLength(1);
  });
});

describe("fetchProjectBeads", () => {
  const entry = (b: unknown) => ({ name: "alpha", path: "/p/alpha", exists: true, beads: b });

  it("REQ-UI-023 requests /api/projects/beads and parses", async () => {
    const body = [entry(beads({ stale: true }))];
    stub(body);
    expect(await fetchProjectBeads()).toEqual(body);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/projects/beads");
  });

  it("REQ-UI-023 rejects a non-array, a missing name and a non-boolean stale", async () => {
    const unexpected = "Could not load projects (unexpected response)";
    stub({ name: "alpha" });
    await expect(fetchProjectBeads()).rejects.toThrow(unexpected);
    stub([{ path: "/p", exists: true, beads: null }]);
    await expect(fetchProjectBeads()).rejects.toThrow(unexpected);
    stub([entry(beads({ stale: "yes" }))]);
    await expect(fetchProjectBeads()).rejects.toThrow(unexpected);
  });

  it("REQ-UI-102 rejects HTTP 500", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 500 }))));
    await expect(fetchProjectBeads()).rejects.toThrow("Could not load projects (HTTP 500)");
  });
});

describe("pullOf", () => {
  const at = "2026-11-19T10:00:00Z";

  it("REQ-BEADS-018 accepts the three statuses", () => {
    expect(pullOf({ pull: { at, status: "ok", error: null } })).toEqual({ at, status: "ok", error: null });
    expect(pullOf({ pull: { at, status: "no_remote", error: null } })?.status).toBe("no_remote");
    expect(pullOf({ pull: { at, status: "error", error: "boom" } })).toEqual({ at, status: "error", error: "boom" });
  });

  it("REQ-BEADS-018 reads a missing, null or malformed pull as null", () => {
    expect(pullOf({})).toBeNull();
    expect(pullOf({ pull: null })).toBeNull();
    expect(pullOf({ pull: "ok" })).toBeNull();
    expect(pullOf({ pull: { at, status: "weird", error: null } })).toBeNull();
    expect(pullOf({ pull: { at: 5, status: "ok", error: null } })).toBeNull();
    expect(pullOf({ pull: { at, status: "error", error: 7 } })).toBeNull();
  });
});
