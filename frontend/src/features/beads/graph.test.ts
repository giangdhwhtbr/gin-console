import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { chainOf, epicsOf, graphOf, place, step, stateOf } from "./graph";

const epic = bead("e", { issue_type: "epic" });
const task = (id: string, blockedBy: string[] = [], extra = {}) =>
  bead(id, { parent: "e", blocked_by: blockedBy, ...extra });
const layers = (g: ReturnType<typeof graphOf>) => Object.fromEntries(g.nodes.map((n) => [n.bead.id, n.layer]));

describe("graph", () => {
  it("REQ-UI-048 chain layers", () => {
    const g = graphOf([epic, task("a"), task("b", ["a"]), task("c", ["b"])], "e", false);
    expect(layers(g)).toEqual({ a: 0, b: 1, c: 2 });
    expect(g.edges).toEqual([
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ]);
  });

  it("REQ-UI-048 diamond layers", () => {
    const g = graphOf([epic, task("a"), task("b", ["a"]), task("c", ["a"]), task("d", ["b", "c"])], "e", false);
    expect(layers(g)).toEqual({ a: 0, b: 1, c: 1, d: 2 });
  });

  it("REQ-UI-048 nested children are nodes", () => {
    const g = graphOf([epic, task("t-1"), bead("t-2", { parent: "t-1" })], "e", false);
    expect(g.nodes.map((n) => n.bead.id).sort()).toEqual(["t-1", "t-2"]);
  });

  it("REQ-UI-048 epic without tasks has no nodes", () => {
    expect(graphOf([epic], "e", false).nodes).toEqual([]);
  });

  it("REQ-UI-049 closed tasks and their arrows are hidden unless shown", () => {
    const beads = [epic, task("a", [], { status: "closed" }), task("b", ["a"])];
    const hidden = graphOf(beads, "e", false);
    expect(hidden.nodes.map((n) => n.bead.id)).toEqual(["b"]);
    expect(hidden.edges).toEqual([]);
    expect(graphOf(beads, "e", true).edges).toEqual([{ from: "a", to: "b" }]);
  });

  it("REQ-UI-049 state follows the board rules", () => {
    expect(stateOf(bead("r", { ready: true }))).toBe("ready");
    expect(stateOf(bead("p", { status: "in_progress" }))).toBe("in_progress");
    expect(stateOf(bead("b", { blocked: true }))).toBe("blocked");
    expect(stateOf(bead("d", { status: "closed" }))).toBe("done");
    expect(stateOf(bead("f", { status: "deferred" }))).toBe("deferred");
  });

  it("REQ-UI-050 outside blocker is an external node in layer 0", () => {
    const g = graphOf([epic, task("t-1", ["x-9"]), bead("x-9", { parent: "other" })], "e", false);
    const x = g.nodes.find((n) => n.bead.id === "x-9");
    expect(x).toMatchObject({ external: true, layer: 0 });
    expect(g.edges).toEqual([{ from: "x-9", to: "t-1" }]);
  });

  it("REQ-UI-050 a cycle terminates and is reported", () => {
    const g = graphOf([epic, task("a", ["b"]), task("b", ["a"])], "e", false);
    expect(g.nodes).toHaveLength(2);
    expect([...g.cycle].sort()).toEqual(["a", "b"]);
  });

  it("REQ-UI-047 epics with task and blocked counts", () => {
    const rows = epicsOf(
      [epic, task("a"), task("b", ["a"], { blocked: true }), task("c"), bead("e2", { issue_type: "epic" })],
      false,
    );
    expect(rows.find((r) => r.epic.id === "e")).toMatchObject({ tasks: 3, blocked: 1 });
    expect(rows.find((r) => r.epic.id === "e2")).toMatchObject({ tasks: 0, blocked: 0 });
  });

  it("REQ-UI-051 chain highlights transitive blockers and blocked only", () => {
    const g = graphOf([epic, task("a"), task("b", ["a"]), task("c", ["b"]), task("z")], "e", false);
    const chain = chainOf(g, "b");
    expect([...chain.nodes].sort()).toEqual(["a", "b", "c"]);
    expect([...chain.edges].sort()).toEqual(["a>b", "b>c"]);
  });

  it("REQ-UI-051 a shortcut edge outside the path is not highlighted", () => {
    const g = graphOf([epic, task("a"), task("b", ["a"]), task("d", ["a", "b"])], "e", false);
    expect([...chainOf(g, "b").edges].sort()).toEqual(["a>b", "b>d"]);
  });

  it("REQ-UI-052 step follows edges and layer neighbours", () => {
    const g = graphOf([epic, task("a"), task("b", ["a"]), task("c", ["a"])], "e", false);
    expect(step(g, "a", "ArrowRight")).toBe("b");
    expect(step(g, "b", "ArrowLeft")).toBe("a");
    expect(step(g, "b", "ArrowDown")).toBe("c");
    expect(step(g, "b", "ArrowUp")).toBeNull();
    expect(step(g, "a", "ArrowLeft")).toBeNull();
  });

  it("REQ-UI-048 place puts layers in columns", () => {
    const g = graphOf([epic, task("a"), task("b", ["a"])], "e", false);
    const { at } = place(g);
    expect(at.get("b")?.x).toBeGreaterThan(at.get("a")?.x ?? Infinity);
  });

  it("REQ-UI-048 an open task under a closed task stays in the graph", () => {
    const g = graphOf([epic, task("t-1", [], { status: "closed" }), bead("t-2", { parent: "t-1" })], "e", false);
    expect(g.nodes.map((n) => n.bead.id)).toEqual(["t-2"]);
    expect(epicsOf([epic, task("t-1", [], { status: "closed" }), bead("t-2", { parent: "t-1" })], false)[0]?.tasks).toBe(1);
  });

  it("REQ-UI-048 a repeated blocker gives one arrow and a self block gives none", () => {
    const g = graphOf([epic, task("a"), task("b", ["a", "a", "b"])], "e", false);
    expect(g.edges).toEqual([{ from: "a", to: "b" }]);
    expect(g.cycle).toEqual([]);
  });

  it("REQ-UI-050 a cycle of three is reported in full", () => {
    const g = graphOf([epic, task("a", ["c"]), task("b", ["a"]), task("c", ["b"])], "e", false);
    expect(g.cycle).toEqual(["a", "b", "c"]);
  });

  it("REQ-UI-049 a closed blocker is not drawn while closed beads are hidden", () => {
    const g = graphOf([epic, task("a", [], { status: "closed" }), task("b", ["a"]), task("c", ["b"])], "e", false);
    expect(g.edges).toEqual([{ from: "b", to: "c" }]);
  });
});
