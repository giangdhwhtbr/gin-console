import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBeads } from "@/features/beads/api";
import { bead, project } from "@/features/beads/beadFixtures";
import { fetchProjects } from "@/features/projects/api";
import { loadMyTasks } from "./load";

vi.mock("@/features/projects/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/projects/api")>()),
  fetchProjects: vi.fn(),
}));
vi.mock("@/features/beads/api", () => ({ fetchBeads: vi.fn() }));

const email = "giangdhwhtbr@gmail.com";
const projects = vi.mocked(fetchProjects);
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
    const result = await loadMyTasks(email, false);
    expect(result.stale).toEqual(["A"]);
  });

  it("REQ-UI-100 gathers my beads across projects in order", async () => {
    beads.mockImplementation((name) =>
      Promise.resolve(
        name === "A"
          ? [
              bead("a-1", { assignee: "giangdhwhtbr", priority: 2, updated_at: "2026-11-10T00:00:00Z" }),
              bead("a-2", { assignee: "alice" }),
            ]
          : [bead("b-1", { assignee: email, priority: 1, updated_at: "2026-11-03T00:00:00Z" })],
      ),
    );
    const result = await loadMyTasks(email, false);
    expect(beads.mock.calls).toEqual([["A", false], ["B", false]]);
    expect(result.tasks.map((t) => [t.project, t.bead.id])).toEqual([["B", "b-1"], ["A", "a-1"]]);
    expect(result.failures).toEqual([]);
  });

  it("REQ-UI-100 equal priority puts the newest update first, then project and id", async () => {
    beads.mockImplementation((name) =>
      Promise.resolve(
        name === "A"
          ? [
              bead("a-2", { assignee: "giangdhwhtbr", updated_at: "2026-11-01T00:00:00Z" }),
              bead("a-1", { assignee: "giangdhwhtbr", updated_at: "2026-11-01T00:00:00Z" }),
            ]
          : [
              bead("b-1", { assignee: "giangdhwhtbr", updated_at: "2026-11-01T00:00:00Z" }),
              bead("b-2", { assignee: "giangdhwhtbr", updated_at: "2026-11-05T00:00:00Z" }),
            ],
      ),
    );
    const result = await loadMyTasks(email, false);
    expect(result.tasks.map((t) => t.bead.id)).toEqual(["b-2", "a-1", "a-2", "b-1"]);
  });

  it("REQ-UI-101 closed is passed through", async () => {
    beads.mockResolvedValue([]);
    await loadMyTasks(email, true);
    expect(beads).toHaveBeenCalledWith("A", true);
  });

  it("REQ-UI-102 a failing project is reported and the others listed", async () => {
    beads.mockImplementation((name) =>
      name === "B" ? Promise.reject(new Error("bd failed")) : Promise.resolve([bead("a-1", { assignee: "giangdhwhtbr" })]),
    );
    const result = await loadMyTasks(email, false);
    expect(result.failures).toEqual([{ project: "B", message: "bd failed" }]);
    expect(result.tasks.map((t) => t.bead.id)).toEqual(["a-1"]);
  });

  it("REQ-UI-102 a projects failure rejects", async () => {
    projects.mockRejectedValue(new Error("Could not load projects (HTTP 500)"));
    await expect(loadMyTasks(email, false)).rejects.toThrow("Could not load projects");
  });
});
