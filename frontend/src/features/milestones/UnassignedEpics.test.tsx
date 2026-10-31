import { describe, expect, it } from "vitest";
import { bead } from "@/features/beads/beadFixtures";
import { unassignedEpics } from "./UnassignedEpics";

describe("unassignedEpics", () => {
  const beads = [
    bead("e-b", { issue_type: "epic", priority: 2 }),
    bead("e-a", { issue_type: "epic", priority: 2, labels: ["roadmap"] }),
    bead("e-p0", { issue_type: "epic", priority: 0 }),
    bead("e-in", { issue_type: "epic", parent: "m-1" }),
    bead("e-child", { issue_type: "epic", parent: "e-a" }),
    bead("t-1", { issue_type: "task" }),
    bead("e-done", { issue_type: "epic", status: "closed" }),
  ];

  it("REQ-MILESTONE-UI-010 keeps open parent-less epics, by priority then id", () => {
    expect(unassignedEpics(beads, false).map((b) => b.id)).toEqual(["e-p0", "e-a", "e-b"]);
  });

  it("REQ-MILESTONE-UI-010 adds closed epics when asked", () => {
    expect(unassignedEpics(beads, true).map((b) => b.id)).toEqual(["e-p0", "e-a", "e-b", "e-done"]);
  });
});
