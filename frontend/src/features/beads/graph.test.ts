import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import {
  ancestorsOf,
  chainOf,
  graphViewPath,
  keepWithAncestors,
  LINK_LABEL,
  linkLabels,
  NODE,
  place,
  scopeGraph,
  stateOf,
  step,
  type Graph,
} from "./graph";

const OFF = { onlyLinked: false };
const epic = (id: string, extra = {}) => bead(id, { issue_type: "epic", ...extra });
const task = (id: string, parent: string | null, blockedBy: string[] = [], extra = {}) =>
  bead(id, { parent, blocked_by: blockedBy, ...extra });
const ids = (g: Graph) => g.nodes.map((n) => n.bead.id).sort();
const layers = (g: Graph) => Object.fromEntries(g.nodes.map((n) => [n.bead.id, n.layer]));
const arrows = (g: Graph) => g.edges.map((e) => `${e.from}>${e.to}:${e.links.length}`).sort();

describe("scope graph", () => {
  it("REQ-UI-075 the project draws the beads without a parent, not their tasks", () => {
    const beads = [epic("r-1"), epic("r-2", { blocked_by: ["r-1"] }), task("a", "r-1"), task("b", "r-2")];
    const g = scopeGraph(beads, null, OFF);
    expect(ids(g)).toEqual(["r-1", "r-2"]);
    expect(arrows(g)).toEqual(["r-1>r-2:1"]);
  });

  it("REQ-UI-075 a bead with children draws its direct children only", () => {
    const beads = [epic("r"), epic("e-1", { parent: "r" }), epic("e-2", { parent: "r" }), task("t", "e-1")];
    expect(ids(scopeGraph(beads, "r", OFF))).toEqual(["e-1", "e-2"]);
  });

  it("REQ-UI-079 relations through tasks merge into one arrow with their links", () => {
    const beads = [epic("e-1"), epic("e-2"), task("x", "e-1"), task("y", "e-2", ["x"]), task("z", "e-2", ["x"])];
    const g = scopeGraph(beads, null, OFF);
    expect(arrows(g)).toEqual(["e-1>e-2:2"]);
    expect(g.edges[0].links).toEqual([
      { from: "x", to: "y" },
      { from: "x", to: "z" },
    ]);
  });

  it("REQ-UI-079 a relation deeper down is lifted to the top-level nodes", () => {
    const beads = [epic("r-1"), epic("r-2"), epic("e-1", { parent: "r-1" }), task("a", "e-1"), task("b", "r-2", ["a"])];
    expect(arrows(scopeGraph(beads, null, OFF))).toEqual(["r-1>r-2:1"]);
  });

  it("REQ-UI-079 a relation inside one node draws no arrow there and is drawn inside it", () => {
    const beads = [epic("e-1"), task("a", "e-1"), task("b", "e-1", ["a"])];
    expect(scopeGraph(beads, null, OFF).edges).toEqual([]);
    expect(arrows(scopeGraph(beads, "e-1", OFF))).toEqual(["a>b:1"]);
  });

  it("REQ-MILESTONE-UI-006 epics whose milestone parent is not loaded are top-level with their edge", () => {
    const beads = [epic("e-a", { parent: "m-1" }), epic("e-b", { parent: "m-1", blocked_by: ["e-a"] })];
    const g = scopeGraph(beads, null, OFF);
    expect(ids(g)).toEqual(["e-a", "e-b"]);
    expect(arrows(g)).toEqual(["e-a>e-b:1"]);
  });

  it("REQ-UI-079 a relation of the scope bead itself is left out", () => {
    const beads = [epic("e-1", { blocked_by: ["a"] }), task("a", "e-1"), task("b", "e-1")];
    expect(scopeGraph(beads, "e-1", OFF).edges).toEqual([]);
  });

  it("REQ-UI-079 a cycle between nodes is drawn and named", () => {
    const beads = [epic("e-1"), epic("e-2"), task("a", "e-1"), task("b", "e-2", ["a"]), task("c", "e-1", ["d"]), task("d", "e-2")];
    const g = scopeGraph(beads, null, OFF);
    expect(ids(g)).toEqual(["e-1", "e-2"]);
    expect(g.cycle).toEqual(["e-1", "e-2"]);
  });

  it("REQ-UI-050 a cycle names every bead on it, also through a cross edge", () => {
    const beads = [epic("e"), task("v", "e", ["u", "w"]), task("u", "e", ["v"]), task("w", "e", ["u"])];
    expect(scopeGraph(beads, "e", OFF).cycle).toEqual(["u", "v", "w"]);
  });

  it("REQ-UI-050 outside beads are drawn on both sides and marked external", () => {
    const beads = [epic("e-1"), epic("e-2"), task("t-1", "e-1", ["x-9"]), task("x-9", "e-2"), task("x-8", "e-2", ["t-1"])];
    const g = scopeGraph(beads, "e-1", OFF);
    expect(ids(g)).toEqual(["t-1", "x-8", "x-9"]);
    expect(g.nodes.filter((n) => n.external).map((n) => n.bead.id).sort()).toEqual(["x-8", "x-9"]);
    expect(layers(g)).toEqual({ "x-9": 0, "t-1": 1, "x-8": 2 });
  });

  it("REQ-UI-050 a parent loop or a missing parent does not hang", () => {
    const beads = [task("a", "b"), task("b", "a"), task("c", "gone")];
    expect(ids(scopeGraph(beads, null, OFF))).toEqual(["c"]);
    expect(ancestorsOf(beads, "a")).toEqual(["b"]);
  });

  it("REQ-UI-106 closed beads that reach the view are drawn with their arrows", () => {
    const beads = [epic("e"), task("a", "e", [], { status: "closed" }), task("b", "e", ["a"])];
    expect(ids(scopeGraph(beads, "e", OFF))).toEqual(["a", "b"]);
    expect(arrows(scopeGraph(beads, "e", OFF))).toEqual(["a>b:1"]);
  });

  it("REQ-UI-081 Only linked leaves out the nodes without an arrow and counts them", () => {
    const beads = [epic("r-1"), epic("r-2", { blocked_by: ["r-1"] }), ...["u", "v", "w", "x", "y"].map((id) => task(id, null))];
    const g = scopeGraph(beads, null, { onlyLinked: true });
    expect(ids(g)).toEqual(["r-1", "r-2"]);
    expect(g.unlinked).toBe(5);
  });

  it("REQ-UI-049 REQ-UI-130 a node says 3 of 5 done from the child counts, whatever children are loaded", () => {
    const beads = [epic("e-1", { child_counts: { total: 5, closed: 3, prep_total: 0, prep_closed: 0 } }), task("a", "e-1"), task("b", "e-1")];
    const node = scopeGraph(beads, null, OFF).nodes[0];
    expect(node.counts).toEqual({ done: 3, inProgress: 0, blocked: 0, ready: 2, deferred: 0 });
  });
});

describe("layout", () => {
  it("REQ-UI-048 chain and diamond layers", () => {
    const chain = scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a"]), task("c", "e", ["b"])], "e", OFF);
    expect(layers(chain)).toEqual({ a: 0, b: 1, c: 2 });
    const diamond = scopeGraph(
      [epic("e"), task("a", "e"), task("b", "e", ["a"]), task("c", "e", ["a"]), task("d", "e", ["b", "c"])],
      "e",
      OFF,
    );
    expect(layers(diamond)).toEqual({ a: 0, b: 1, c: 1, d: 2 });
  });

  it("REQ-UI-048 No relations: unlinked tasks fill rows of 3 by priority then id", () => {
    const beads = [epic("e"), ...["g", "f", "e1", "d", "c", "b", "a"].map((id) => task(id, "e"))];
    const g = scopeGraph(beads, "e", OFF);
    const sorted = [...g.nodes].sort((x, y) => x.layer - y.layer || x.order - y.order);
    expect(sorted.map((n) => n.bead.id)).toEqual(["a", "b", "c", "d", "e1", "f", "g"]);
    expect(sorted.map((n) => n.layer)).toEqual([0, 0, 0, 1, 1, 1, 2]);
    expect(sorted.map((n) => n.order)).toEqual([0, 1, 2, 0, 1, 2, 0]);
    expect(sorted.every((n) => n.group === "unlinked")).toBe(true);
  });

  it("REQ-UI-048 Linked and unlinked: the group starts below the last layer", () => {
    const beads = [epic("e"), task("a", "e"), task("b", "e", ["a"]), ...["c", "d", "e1", "f"].map((id) => task(id, "e"))];
    const g = scopeGraph(beads, "e", OFF);
    const at = (id: string) => g.nodes.find((n) => n.bead.id === id);
    expect([at("a")?.layer, at("b")?.layer, at("a")?.group, at("b")?.group]).toEqual([0, 1, "layer", "layer"]);
    expect(["c", "d", "e1", "f"].map((id) => at(id)?.layer)).toEqual([2, 2, 2, 3]);
    expect(["c", "d", "e1", "f"].map((id) => at(id)?.group)).toEqual(["unlinked", "unlinked", "unlinked", "unlinked"]);
    const { at: pos, height } = place(g);
    expect(pos.get("f")?.y).toBeGreaterThan(pos.get("b")?.y ?? 0);
    expect(height).toBeGreaterThan((pos.get("f")?.y ?? 0) + NODE.h);
  });

  it("REQ-UI-048 orders a layer by the position of its blockers", () => {
    const g = scopeGraph([epic("e"), task("a", "e"), task("b", "e"), task("x", "e", ["b"]), task("y", "e", ["a"])], "e", OFF);
    const order = (id: string) => g.nodes.find((n) => n.bead.id === id)?.order;
    expect([order("a"), order("b"), order("y"), order("x")]).toEqual([0, 1, 0, 1]);
  });

  it("REQ-UI-048 places layers from the top", () => {
    const g = scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a"])], "e", OFF);
    const { at } = place(g);
    expect(at.get("a")?.y).toBeLessThan(at.get("b")?.y ?? 0);
    expect(at.get("a")?.x).toBe(at.get("b")?.x);
  });

  it("REQ-UI-052 arrows go down to a blocked bead, up to a blocker, sideways in a layer", () => {
    const g = scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a", "c"]), task("c", "e")], "e", OFF);
    expect(step(g, "a", "ArrowDown")).toBe("b");
    expect(step(g, "b", "ArrowUp")).toBe("a");
    expect(step(g, "a", "ArrowRight")).toBe("c");
    expect(step(g, "c", "ArrowLeft")).toBe("a");
    expect(step(g, "b", "ArrowDown")).toBeNull();
  });

  it("REQ-UI-051 the chain of a node covers its blockers and its blocked beads", () => {
    const g = scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a"]), task("c", "e", ["b"]), task("z", "e")], "e", OFF);
    expect([...chainOf(g, "b").nodes].sort()).toEqual(["a", "b", "c"]);
  });

  it("REQ-UI-049 a closed bead is Done", () => {
    expect(stateOf(task("a", null, [], { status: "closed" }))).toBe("done");
  });

  it("REQ-UI-053 the Graph view path: scope with children, else the parent's scope with select, else select alone", () => {
    expect(graphViewPath("p", { id: "t-1", parent: "e-1" }, true)).toBe("/beads?project=p&view=graph&scope=t-1");
    expect(graphViewPath("p", { id: "t-2", parent: "e-1" }, false)).toBe("/beads?project=p&view=graph&scope=e-1&select=t-2");
    expect(graphViewPath("p", { id: "t-3", parent: null }, false)).toBe("/beads?project=p&view=graph&select=t-3");
    expect(graphViewPath("p q", { id: "a/b", parent: null }, false)).toBe("/beads?project=p+q&view=graph&select=a%2Fb");
  });

  it("REQ-UI-048 10k-long blocked_by chain does not overflow the stack", () => {
    const count = 10000;
    const beads: ReturnType<typeof task>[] = [epic("e")];
    for (let i = 0; i < count; i++) {
      beads.push(task(`t-${i}`, "e", i === 0 ? [] : [`t-${i - 1}`]));
    }
    const g = scopeGraph(beads, "e", OFF);
    expect(g.nodes.length).toBe(count);
    expect(g.nodes.find((n) => n.bead.id === "t-0")?.layer).toBe(0);
    expect(g.nodes.find((n) => n.bead.id === `t-${count - 1}`)?.layer).toBe(count - 1);
  });

  it("REQ-UI-079 holder closed with open children under scope", () => {
    const beads = [
      epic("e"),
      epic("sub", { parent: "e", status: "closed" }),
      task("c1", "sub"),
      task("c2", "sub", ["c1"]),
    ];
    expect(ids(scopeGraph(beads, "e", OFF))).toEqual(["sub"]);
  });

  it("REQ-UI-079 scope blocking its own child is dropped", () => {
    const beads = [epic("e"), task("t-1", "e", ["e"]), task("t-2", "e", ["t-1"])];
    const g = scopeGraph(beads, "e", OFF);
    expect(ids(g)).toEqual(["t-1", "t-2"]);
    expect(arrows(g)).toEqual(["t-1>t-2:1"]);
  });

  it("REQ-UI-079 outside end that is a scope ancestor appears as external node", () => {
    const beads = [
      epic("top"),
      epic("child", { parent: "top" }),
      task("t", "child", ["top"]),
    ];
    const g = scopeGraph(beads, "child", OFF);
    expect(ids(g)).toEqual(["t", "top"]);
    const topNode = g.nodes.find((n) => n.bead.id === "top");
    expect(topNode?.external).toBe(true);
    expect(arrows(g)).toEqual(["top>t:1"]);
  });

  it("REQ-UI-079 duplicate blocked_by relations merge cleanly", () => {
    const beads = [epic("e"), task("a", "e"), task("b", "e", ["a", "a"])];
    const g = scopeGraph(beads, "e", OFF);
    expect(arrows(g)).toEqual(["a>b:1"]);
    expect(g.edges[0].links).toEqual([{ from: "a", to: "b" }]);
  });

  it("REQ-UI-048 No relations places all nodes at layer 0", () => {
    const beads = [epic("e"), task("a", "e"), task("b", "e"), task("c", "e")];
    const g = scopeGraph(beads, "e", OFF);
    expect(layers(g)).toEqual({ a: 0, b: 0, c: 0 });
    expect(g.edges).toEqual([]);
  });

  it("REQ-UI-050 a<->b cycle in one epic", () => {
    const beads = [epic("e"), task("a", "e", ["b"]), task("b", "e", ["a"])];
    const g = scopeGraph(beads, "e", OFF);
    expect(g.cycle).toEqual(["a", "b"]);
  });
});

describe("REQ-UI-106 keep", () => {
  const beads = [epic("m2"), epic("e1", { parent: "m2" }), task("e1.1", "e1"), task("e2", "m2"), task("x", null, ["e2"])];

  it("keepWithAncestors returns the matched ids and their ancestors", () => {
    const keep = keepWithAncestors(beads, [beads[2]]);
    expect([...keep].sort()).toEqual(["e1", "e1.1", "m2"]);
  });

  it("scopeGraph drops beads outside keep and the arrows from them", () => {
    const keep = new Set(["m2", "e1", "e1.1"]);
    const g = scopeGraph(beads, "m2", { onlyLinked: false, keep });
    expect(ids(g)).toEqual(["e1"]);
    expect(g.edges).toEqual([]);
  });
});

describe("link labels", () => {
  const n = (id: string, layer: number, order: number) => ({
    bead: bead(id), external: false, layer, order, counts: { done: 0, inProgress: 0, blocked: 0, ready: 0, deferred: 0 }, hasKids: false, group: "layer" as const,
  });
  const link = (from: string, to: string, count: number) => ({
    from, to, links: Array.from({ length: count }, (_, i) => ({ from: `${from}.${i}`, to: `${to}.${i}` })),
  });

  it("REQ-UI-110 two multi-link edges with the same middle get labels that do not overlap", () => {
    const graph = {
      nodes: [n("a", 0, 0), n("b", 0, 2), n("c", 1, 0), n("d", 1, 2)],
      edges: [link("a", "d", 8), link("b", "c", 2)],
      cycle: [], unlinked: 0,
    };
    const spots = [...linkLabels(graph, place(graph).at).values()];
    expect(spots).toHaveLength(2);
    const [p, q] = spots;
    expect(Math.abs(p.x - q.x) >= LINK_LABEL.w || Math.abs(p.y - q.y) >= LINK_LABEL.h).toBe(true);
  });

  it("REQ-UI-110 three colliding labels stay apart and inside the gap under their blockers", () => {
    const graph = {
      nodes: [n("a", 0, 0), n("b", 0, 1), n("c", 0, 2), n("d", 1, 0), n("e", 1, 1), n("f", 1, 2)],
      edges: [link("a", "f", 3), link("b", "e", 2), link("c", "d", 5)],
      cycle: [], unlinked: 0,
    };
    const { at } = place(graph);
    const spots = [...linkLabels(graph, at).values()];
    expect(spots).toHaveLength(3);
    const top = at.get("a")!.y + NODE.h;
    for (const s of spots) {
      expect(s.y).toBeGreaterThanOrEqual(top + LINK_LABEL.h);
      expect(s.y).toBeLessThanOrEqual(top + NODE.gapY);
    }
    for (const [i, p] of spots.entries())
      for (const q of spots.slice(i + 1))
        expect(Math.abs(p.x - q.x) >= LINK_LABEL.w || Math.abs(p.y - q.y) >= LINK_LABEL.h).toBe(true);
  });

  it("REQ-UI-110 an edge with one link has no label", () => {
    const graph = { nodes: [n("a", 0, 0), n("c", 1, 0)], edges: [link("a", "c", 1)], cycle: [], unlinked: 0 };
    expect(linkLabels(graph, place(graph).at).size).toBe(0);
  });
});
