import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBeads } from "@/features/beads/api";
import { bead, project } from "@/features/beads/beadFixtures";
import { fetchProjectBeads } from "@/features/projects/api";
import { loadMyTasks } from "./load";

vi.mock("@/features/projects/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/projects/api")>()),
  fetchProjectBeads: vi.fn(),
}));
vi.mock("@/features/beads/api", () => ({ fetchBeads: vi.fn() }));

const projects = vi.mocked(fetchProjectBeads);
const beads = vi.mocked(fetchBeads);

beforeEach(() => {
  vi.resetAllMocks();
  projects.mockResolvedValue([project("A"), project("B"), project("C", false)]);
});

describe("loadMyTasks", () => {
  it("REQ-UI-103 lists stale projects", async () => {
    const withStale = (name: string, stale: boolean, exists = true) => ({
      ...project(name, exists),
      beads: { open: 0, in_progress: 0, blocked: 0, ready: 0, epics: [], stale },
    });
    projects.mockResolvedValue([withStale("A", true), withStale("B", false), withStale("C", true, false)]);
    beads.mockResolvedValue([]);
    const result = await loadMyTasks(false, "A");
    expect(result.stale).toEqual(["A"]);
  });

  it("REQ-BEADS-018 lists the failed pull of the current project only", async () => {
    const pull = (status: "ok" | "error") => ({ at: "2026-11-19T10:00:00Z", status, error: status === "error" ? "boom" : null });
    projects.mockResolvedValue([
      { ...project("A"), pull: pull("error") },
      { ...project("B"), pull: null },
      { ...project("C"), pull: pull("ok") },
      { ...project("D") },
    ]);
    beads.mockResolvedValue([]);
    expect((await loadMyTasks(false, "A")).pullFailures).toEqual([{ project: "A", path: "/home/gin/A", error: "boom" }]);
    expect((await loadMyTasks(false, "B")).pullFailures).toEqual([]);
  });

  it("REQ-UI-100 returns every bead of the current project, not only mine, from that project only", async () => {
    beads.mockResolvedValue([bead("a-1", { assignee: "giangdhwhtbr" }), bead("a-2", { assignee: "alice" }), bead("a-3")]);
    const result = await loadMyTasks(false, "A");
    expect(beads.mock.calls).toEqual([["A", false]]);
    expect(result.beads.map((b) => b.id)).toEqual(["a-1", "a-2", "a-3"]);
    expect(result.failures).toEqual([]);
  });

  it("REQ-UI-101 closed is passed through", async () => {
    beads.mockResolvedValue([]);
    await loadMyTasks(true, "B");
    expect(beads).toHaveBeenCalledWith("B", true);
  });

  it("REQ-UI-102 a failing project is reported", async () => {
    beads.mockRejectedValue(new Error("bd failed"));
    const result = await loadMyTasks(false, "B");
    expect(result.failures).toEqual([{ project: "B", message: "bd failed" }]);
    expect(result.beads).toEqual([]);
  });

  it("REQ-UI-102 a projects failure rejects", async () => {
    projects.mockRejectedValue(new Error("Could not load projects (HTTP 500)"));
    await expect(loadMyTasks(false, "A")).rejects.toThrow("Could not load projects");
  });
});

describe("loadMyTasks merge gates", () => {
  it("REQ-UI-150 a merge gate is returned so that a blocker can be named; the groups leave it out", async () => {
    const gate = bead("a-2", { waits_for: { plan: "p", number: 1, track_id: null, lane: null } });
    beads.mockResolvedValue([bead("a-1"), gate]);
    expect((await loadMyTasks(false, "A")).beads.map((b) => b.id)).toEqual(["a-1", "a-2"]);
  });
});
