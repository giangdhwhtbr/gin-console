import { describe, expect, it } from "vitest";
import { bead } from "@/features/beads/beadFixtures";
import type { BeadSummary } from "@/features/beads/api";
import { compareBeads, groupWork } from "./groups";

const EMAIL = "ann@x.com";
const ready = (id: string, o: Partial<BeadSummary> = {}) => bead(id, { ready: true, ...o });
const ids = (groups: ReturnType<typeof groupWork>, key: string) => groups.find((g) => g.key === key)?.beads.map((b) => b.id);

describe("groupWork (REQ-UI-150)", () => {
  it("REQ-UI-150 each group", () => {
    const groups = groupWork(
      [
        ready("t-1", { assignee: "ann" }),
        ready("t-2"),
        bead("t-3", { status: "in_progress", assignee: "ann" }),
        bead("t-4", { assignee: "ann", blocked: true, blocked_by: ["t-5"] }),
        bead("t-5", { assignee: "bob", status: "in_progress" }),
        bead("t-6", { assignee: "bob", blocked: true, blocked_by: ["t-3"] }),
      ],
      EMAIL,
    );
    expect(groups.map((g) => g.key)).toEqual(["mine", "unclaimed", "in_progress", "blocked", "waiting", "closed"]);
    expect(ids(groups, "mine")).toEqual(["t-1"]);
    expect(ids(groups, "unclaimed")).toEqual(["t-2"]);
    expect(ids(groups, "in_progress")).toEqual(["t-3"]);
    expect(ids(groups, "blocked")).toEqual(["t-4"]);
    expect(ids(groups, "waiting")).toEqual(["t-6"]);
    expect(groups.flatMap((g) => g.beads.map((b) => b.id))).not.toContain("t-5");
  });

  it("REQ-UI-150 prep task: a track label makes it work", () => {
    const groups = groupWork([ready("p-1", { labels: ["prep"] }), ready("p-2", { labels: ["prep", "track:2"] })], EMAIL);
    expect(ids(groups, "unclaimed")).toEqual(["p-2"]);
  });

  it("REQ-UI-150 epic, milestone and merge gate are left out", () => {
    const gate = ready("g-1", { waits_for: { plan: "p", number: 2, track_id: null, lane: "be" } });
    const groups = groupWork([ready("e-1", { issue_type: "epic" }), ready("m-1", { issue_type: "milestone" }), gate], EMAIL);
    expect(groups.flatMap((g) => g.beads)).toEqual([]);
  });

  it("REQ-UI-150 empty group still listed", () => {
    const groups = groupWork([ready("t-1", { assignee: "ann" })], EMAIL);
    expect(ids(groups, "mine")).toEqual(["t-1"]);
    expect(ids(groups, "in_progress")).toEqual([]);
    expect(groups).toHaveLength(6);
  });

  it("REQ-UI-150 deferred bead of mine is in no group", () => {
    const groups = groupWork([bead("t-1", { assignee: "ann", status: "deferred" })], EMAIL);
    expect(groups.flatMap((g) => g.beads)).toEqual([]);
  });

  it("REQ-UI-150 a blocked bead of mine that blocks another's stays Blocked, the other waits", () => {
    const groups = groupWork(
      [
        bead("a", { assignee: "ann", blocked: true, blocked_by: ["z"] }),
        bead("z", { assignee: "bob", status: "in_progress" }),
        bead("b", { assignee: "bob", blocked: true, blocked_by: ["a"] }),
      ],
      EMAIL,
    );
    expect(ids(groups, "blocked")).toEqual(["a"]);
    expect(ids(groups, "waiting")).toEqual(["b"]);
  });

  it("REQ-UI-150 a bead blocked only by my closed bead is not waiting on me", () => {
    const groups = groupWork(
      [bead("a", { assignee: "ann", status: "closed" }), bead("b", { assignee: "bob", blocked: true, blocked_by: ["a"] })],
      EMAIL,
    );
    expect(ids(groups, "waiting")).toEqual([]);
  });

  it("REQ-UI-150 closed holds only my closed beads, newest closed first", () => {
    const groups = groupWork(
      [
        bead("c-1", { assignee: "ann", status: "closed", closed_at: "2026-10-01T00:00:00Z" }),
        bead("c-2", { assignee: "ann", status: "closed", closed_at: "2026-10-05T00:00:00Z" }),
        bead("c-3", { assignee: "bob", status: "closed", closed_at: "2026-10-09T00:00:00Z" }),
      ],
      EMAIL,
    );
    expect(ids(groups, "closed")).toEqual(["c-2", "c-1"]);
  });

  it("REQ-UI-150 order inside a group: priority, newest update, id", () => {
    const groups = groupWork(
      [
        ready("t-4", { assignee: "ann", priority: 2, updated_at: "2026-10-01T00:00:00Z" }),
        ready("t-3", { assignee: "ann", priority: 2, updated_at: "2026-10-09T00:00:00Z" }),
        ready("t-2", { assignee: "ann", priority: 2, updated_at: "2026-10-09T00:00:00Z" }),
        ready("t-1", { assignee: "ann", priority: 0, updated_at: "2026-10-01T00:00:00Z" }),
      ],
      EMAIL,
    );
    expect(ids(groups, "mine")).toEqual(["t-1", "t-2", "t-3", "t-4"]);
  });
});

describe("compareBeads (REQ-UI-100)", () => {
  it("orders by priority, then newest update, then id", () => {
    expect(compareBeads(bead("a", { priority: 1 }), bead("b", { priority: 2 }))).toBeLessThan(0);
    expect(compareBeads(bead("a", { updated_at: "2026-10-01T00:00:00Z" }), bead("b", { updated_at: "2026-10-02T00:00:00Z" }))).toBeGreaterThan(0);
    expect(compareBeads(bead("a"), bead("b"))).toBeLessThan(0);
  });
});
