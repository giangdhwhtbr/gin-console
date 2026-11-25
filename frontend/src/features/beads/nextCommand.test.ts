import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { nextCommand } from "./nextCommand";

const EMAIL = "ann@x.com";

describe("nextCommand (REQ-BEADS-025)", () => {
  it("REQ-BEADS-025 ready and unclaimed", () => {
    expect(nextCommand(bead("t-1", { ready: true }), EMAIL, null)).toBe("gin task update t-1 --claim");
  });
  it("REQ-BEADS-025 ready and mine", () => {
    expect(nextCommand(bead("t-2", { ready: true, assignee: "ann" }), EMAIL, null)).toBe("gin task update t-2 --claim");
  });
  it("REQ-BEADS-025 in progress and mine", () => {
    expect(nextCommand(bead("t-3", { status: "in_progress", assignee: "ANN@other.com" }), EMAIL, null)).toBe("/gin:execute t-3");
  });
  it("REQ-BEADS-025 in progress for another person", () => {
    expect(nextCommand(bead("t-4", { status: "in_progress", assignee: "bob" }), EMAIL, null)).toBeNull();
  });
  it("REQ-BEADS-025 ready but assigned to another person", () => {
    expect(nextCommand(bead("t-5", { ready: true, assignee: "bob" }), EMAIL, null)).toBeNull();
  });
  it("REQ-BEADS-025 blocked", () => {
    expect(nextCommand(bead("t-6", { status: "in_progress", assignee: "ann", blocked: true, blocked_by: ["t-9"] }), EMAIL, null)).toBeNull();
  });
  it("REQ-BEADS-025 epic by stage", () => {
    const epic = bead("e-1", { issue_type: "epic", ready: true });
    expect(nextCommand(epic, EMAIL, "plan")).toBe("/gin:plan e-1");
    expect(nextCommand(epic, EMAIL, "discuss")).toBe("/gin:discuss e-1");
    expect(nextCommand(epic, EMAIL, "orchestrate")).toBe("/gin:orchestrate e-1");
    expect(nextCommand(epic, EMAIL, "ship")).toBe("/gin:ship e-1");
    expect(nextCommand(epic, EMAIL, "execute")).toBe("/gin:execute e-1");
    expect(nextCommand(epic, EMAIL, "progress")).toBeNull();
    expect(nextCommand(epic, EMAIL, "whatever")).toBeNull();
    expect(nextCommand(epic, EMAIL, null)).toBeNull();
  });
  it("REQ-BEADS-025 merge gate and milestone", () => {
    const gate = bead("g-1", { ready: true, waits_for: { plan: "p", number: 2, track_id: null, lane: null } });
    expect(nextCommand(gate, EMAIL, null)).toBeNull();
    expect(nextCommand(bead("m-1", { issue_type: "milestone", ready: true }), EMAIL, null)).toBeNull();
  });
  it("REQ-BEADS-025 closed and deferred have none", () => {
    expect(nextCommand(bead("t-7", { status: "closed", assignee: "ann" }), EMAIL, null)).toBeNull();
    expect(nextCommand(bead("t-8", { status: "deferred", assignee: "ann" }), EMAIL, null)).toBeNull();
  });
});
