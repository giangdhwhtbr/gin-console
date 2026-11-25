import { describe, expect, it } from "vitest";
import type { BeadSummary, Relation } from "./api";
import { bead } from "./beadFixtures";
import { blockerLabel, blockerSummary, openBlockers, waitsOn } from "./blockers";

const rel = (id: string, o: Partial<Relation> = {}): Relation => ({ id, title: `T ${id}`, status: "open", type: "blocks", ...o });
const known = (...beads: BeadSummary[]) => new Map(beads.map((b) => [b.id, b]));
const GATE = { plan: "p", number: 2, track_id: null, lane: "be" };

describe("openBlockers (REQ-UI-152)", () => {
  it("keeps open blocks relations by id and drops closed and other types", () => {
    const list = openBlockers({
      dependencies: [rel("t-10"), rel("t-2"), rel("t-4", { status: "closed" }), rel("t-5", { type: "parent-child" })],
    });
    expect(list.map((r) => r.id)).toEqual(["t-2", "t-10"]);
  });
});

describe("blockerLabel (REQ-UI-065)", () => {
  it("uses the title, or gate words for a merge gate", () => {
    expect(blockerLabel(bead("a", { title: "Set up CI" }))).toBe("Set up CI");
    expect(blockerLabel(bead("g", { title: "docs/plan.md", waits_for: GATE }))).toBe("be #2, merge pending");
    expect(blockerLabel(bead("g", { waits_for: { ...GATE, lane: null } }))).toBe("track 2, merge pending");
  });
});

describe("blockerSummary (REQ-UI-100)", () => {
  it("names the first open blocker by id and counts the rest", () => {
    const b = bead("x", { blocked_by: ["t-3", "t-2", "t-4"] });
    const map = known(bead("t-2", { title: "Two" }), bead("t-3"), bead("t-4", { status: "closed" }));
    expect(blockerSummary(b, map)).toEqual({ label: "Two", more: 1 });
  });
  it("drops a closed blocker; none left gives null", () => {
    expect(blockerSummary(bead("x", { blocked_by: ["t-4"] }), known(bead("t-4", { status: "closed" })))).toBeNull();
  });
  it("an unknown blocker counts as open and is named by its id", () => {
    expect(blockerSummary(bead("x", { blocked_by: ["zz-1"] }), known())).toEqual({ label: "zz-1", more: 0 });
  });
  it("names a merge gate by its gate words", () => {
    const gate = bead("g-1", { title: "docs/plan.md", waits_for: GATE });
    expect(blockerSummary(bead("x", { blocked_by: ["g-1"] }), known(gate))).toEqual({ label: "be #2, merge pending", more: 0 });
  });
});

describe("waitsOn (REQ-UI-065)", () => {
  it("is the label of the first open blocker of mine, skipping others and closed ones", () => {
    const map = known(
      bead("a-1", { assignee: "bob" }),
      bead("a-2", { assignee: "ann", status: "closed" }),
      bead("a-3", { assignee: "ann@x.com", title: "Mine three" }),
      bead("a-4", { assignee: "ann", title: "Mine four" }),
    );
    expect(waitsOn(bead("x", { blocked_by: ["a-4", "a-1", "a-2", "a-3"] }), map, "ann@x.com")).toBe("Mine three");
  });
  it("is null without one, or when the blocker is unknown", () => {
    expect(waitsOn(bead("x", { blocked_by: ["a-1", "zz"] }), known(bead("a-1", { assignee: "bob" })), "ann@x.com")).toBeNull();
  });
});
