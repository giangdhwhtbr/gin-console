import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { allBranches, ancestorsOf, keepSet, TREE_LIMIT, treeIndex, treeRows } from "./tree";

const names = (rows: { level: number; bead: { id: string }; repeated: boolean }[]) =>
  rows.map((r) => `${"-".repeat(r.level)}${r.bead.id}${r.repeated ? "*" : ""}`);
const expanded = (index: ReturnType<typeof treeIndex>) => treeRows(index, allBranches(index), null);

describe("tree", () => {
  // REQ-UI-041
  it("REQ-UI-041 roots are beads without a loaded parent; children follow their parent", () => {
    const index = treeIndex(
      [
        bead("e-1", { issue_type: "epic", priority: 1 }),
        bead("t-1", { parent: "e-1", priority: 1 }),
        bead("t-2", { parent: "e-1", priority: 2 }),
        bead("x-1", { priority: 3 }),
        bead("o-1", { parent: "gone", priority: 4 }),
      ],
      "hierarchy",
    );
    expect(names(expanded(index).rows)).toEqual(["e-1", "-t-1", "-t-2", "x-1", "o-1"]);
  });

  // REQ-UI-041
  it("REQ-UI-041 only the roots show until a branch is open", () => {
    const index = treeIndex([bead("e-1"), bead("t-1", { parent: "e-1" })], "hierarchy");
    expect(names(treeRows(index, new Set(), null).rows)).toEqual(["e-1"]);
    expect(names(treeRows(index, new Set(["e-1"]), null).rows)).toEqual(["e-1", "-t-1"]);
  });

  // REQ-UI-041
  it("REQ-UI-041 siblings are ordered by priority, then newest update", () => {
    const index = treeIndex(
      [
        bead("p2", { priority: 2, updated_at: "2026-10-09T00:00:00Z" }),
        bead("p1-old", { priority: 1, updated_at: "2026-10-01T00:00:00Z" }),
        bead("p1-new", { priority: 1, updated_at: "2026-10-08T00:00:00Z" }),
      ],
      "hierarchy",
    );
    expect(names(expanded(index).rows)).toEqual(["p1-new", "p1-old", "p2"]);
  });

  // REQ-UI-041
  it("REQ-UI-041 a parent cycle still shows every bead once as a root", () => {
    const index = treeIndex([bead("a", { parent: "b" }), bead("b", { parent: "a" })], "hierarchy");
    expect(names(expanded(index).rows)).toEqual(["a", "-b", "--a*"]);
  });

  // REQ-UI-042
  it("REQ-UI-042 blocking: roots block others and are blocked by none; children are what they block", () => {
    const index = treeIndex(
      [
        bead("a-1"),
        bead("a-2", { blocked_by: ["a-1"] }),
        bead("a-3", { blocked_by: ["a-2"] }),
        bead("lone"),
        bead("gone-child", { blocked_by: ["not-loaded"] }),
      ],
      "blocking",
    );
    expect(names(expanded(index).rows)).toEqual(["a-1", "-a-2", "--a-3"]);
  });

  // REQ-UI-042
  it("REQ-UI-042 blocking: a bead blocked from two places shows under both", () => {
    const index = treeIndex(
      [bead("a-1", { priority: 1 }), bead("a-2", { priority: 2 }), bead("a-3", { blocked_by: ["a-1", "a-2"] })],
      "blocking",
    );
    expect(names(expanded(index).rows)).toEqual(["a-1", "-a-3", "a-2", "-a-3"]);
  });

  // REQ-UI-042
  it("REQ-UI-042 blocking: a cycle is finite and the repeat is a leaf marked repeated", () => {
    const index = treeIndex(
      [bead("a-1", { blocked_by: ["a-2"] }), bead("a-2", { blocked_by: ["a-1"] })],
      "blocking",
    );
    const { rows } = expanded(index);
    expect(names(rows)).toEqual(["a-1", "-a-2", "--a-1*"]);
    expect(rows[2]?.hasKids).toBe(false);
  });

  // REQ-UI-042
  it("REQ-UI-042 a bead that blocks itself is ignored", () => {
    const index = treeIndex([bead("a-1", { blocked_by: ["a-1"] })], "blocking");
    expect(expanded(index).rows).toEqual([]);
  });

  // REQ-UI-042
  it("REQ-UI-042 shows at most TREE_LIMIT rows and counts the rest", () => {
    const beads = Array.from({ length: TREE_LIMIT + 100 }, (_, i) => bead(`n-${i}`));
    const result = expanded(treeIndex(beads, "hierarchy"));
    expect(result.rows).toHaveLength(TREE_LIMIT);
    expect(result.omitted).toBe(100);
  });

  // REQ-UI-043
  it("REQ-UI-043 keepSet holds the matches and their ancestors; rows show only those", () => {
    const index = treeIndex(
      [
        bead("e-1", { issue_type: "epic" }),
        bead("t-1", { parent: "e-1", title: "Fix login" }),
        bead("t-2", { parent: "e-1", title: "Add search" }),
      ],
      "hierarchy",
    );
    const keep = keepSet(index, new Set(["t-1"]));
    expect([...keep].sort()).toEqual(["e-1", "t-1"]);
    expect(names(treeRows(index, keep, keep).rows)).toEqual(["e-1", "-t-1"]);
  });

  // REQ-UI-043
  it("REQ-UI-043 ancestorsOf lists the ancestors without the bead itself", () => {
    const index = treeIndex(
      [bead("e-1"), bead("t-1", { parent: "e-1" }), bead("s-1", { parent: "t-1" })],
      "hierarchy",
    );
    expect([...ancestorsOf(index, "s-1")].sort()).toEqual(["e-1", "t-1"]);
    expect([...ancestorsOf(index, "e-1")]).toEqual([]);
  });

  // REQ-UI-044
  it("REQ-UI-044 rows carry level, branch state, child progress and blocker count", () => {
    const index = treeIndex(
      [
        bead("e-1", { issue_type: "epic" }),
        bead("t-1", { parent: "e-1", status: "closed" }),
        bead("t-2", { parent: "e-1", blocked_by: ["t-1", "gone"] }),
      ],
      "hierarchy",
    );
    const [epic, , second] = expanded(index).rows;
    expect(epic).toMatchObject({ level: 0, hasKids: true, open: true, totalKids: 2, closedKids: 1 });
    expect(second).toMatchObject({ level: 1, hasKids: false, blockers: 1 });
    expect(treeRows(index, new Set(), null).rows[0]).toMatchObject({ open: false });
  });

  // REQ-UI-044
  it("REQ-UI-044 allBranches lists the beads that have children", () => {
    const index = treeIndex([bead("e-1"), bead("t-1", { parent: "e-1" })], "hierarchy");
    expect([...allBranches(index)]).toEqual(["e-1"]);
  });
});
