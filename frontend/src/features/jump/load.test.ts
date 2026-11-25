import { afterEach, describe, expect, it, vi } from "vitest";
import { bead, json } from "@/features/beads/beadFixtures";
import { loadAllBeads } from "./load";

afterEach(() => vi.unstubAllGlobals());

const projects = [
  { name: "alpha", path: "/a", exists: true, beads: null },
  { name: "beta", path: "/b", exists: true, beads: null },
  { name: "gone", path: "/g", exists: false, beads: null },
];

describe("loadAllBeads", () => {
  it("REQ-UI-154 loads closed beads of existing projects and names a failing one", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/projects/beads") return Promise.resolve(json(projects));
      if (url.includes("project=alpha")) return Promise.resolve(json([bead("a-1")]));
      return Promise.resolve(json({ error: "boom" }, 500));
    });
    vi.stubGlobal("fetch", fetchMock);
    const loaded = await loadAllBeads();
    expect(loaded.entries.map((e) => `${e.project}/${e.bead.id}`)).toEqual(["alpha/a-1"]);
    expect(loaded.failures).toEqual(["beta"]);
    expect(fetchMock.mock.calls.map(([u]) => u)).toContain("/api/beads?project=alpha&closed=1");
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("gone"))).toBe(false);
  });
});
