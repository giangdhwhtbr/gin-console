import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import {
  ancestorsOf,
  chainOf,
  graphFor,
  graphPath,
  neighbourhoodOf,
  place,
  progressOf,
  relationsOf,
  scopeGraph,
  stateOf,
  step,
  type Graph,
} from "./graph";

const OFF = { hideDone: false, onlyLinked: false };
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

  it("REQ-UI-076 closed beads are drawn; Hide done leaves them and their arrows out", () => {
    const beads = [epic("e"), task("a", "e", [], { status: "closed" }), task("b", "e", ["a"])];
    expect(arrows(scopeGraph(beads, "e", OFF))).toEqual(["a>b:1"]);
    const hidden = scopeGraph(beads, "e", { hideDone: true, onlyLinked: false });
    expect(ids(hidden)).toEqual(["b"]);
    expect(hidden.edges).toEqual([]);
  });

  it("REQ-UI-081 Only linked leaves out the nodes without an arrow and counts them", () => {
    const beads = [epic("r-1"), epic("r-2", { blocked_by: ["r-1"] }), ...["u", "v", "w", "x", "y"].map((id) => task(id, null))];
    const g = scopeGraph(beads, null, { hideDone: false, onlyLinked: true });
    expect(ids(g)).toEqual(["r-1", "r-2"]);
    expect(g.unlinked).toBe(5);
  });

  it("REQ-UI-049 a node carries n of m done over its direct children", () => {
    const beads = [epic("e-1"), task("a", "e-1", [], { status: "closed" }), task("b", "e-1"), task("c", "e-1")];
    const node = scopeGraph(beads, null, OFF).nodes[0];
    expect({ done: node.done, total: node.total }).toEqual({ done: 1, total: 3 });
    expect(progressOf(beads).get("")).toEqual({ done: 0, total: 1 });
  });
});

describe("neighbourhood", () => {
  it("REQ-UI-075 draws blockers above and blocked beads below, directly or not, and nothing else", () => {
    const beads = [task("a", null), task("b", null, ["a"]), task("c", null, ["b"]), task("d", null, ["c"]), task("z", null)];
    const g = neighbourhoodOf(beads, "c", { hideDone: false });
    expect(layers(g)).toEqual({ a: 0, b: 1, c: 2, d: 3 });
  });

  it("REQ-UI-075 graphFor picks the scope graph for a bead with children and the neighbourhood otherwise", () => {
    const beads = [epic("e"), task("a", "e"), task("b", "e", ["a"])];
    expect(ids(graphFor(beads, "e", OFF))).toEqual(["a", "b"]);
    expect(ids(graphFor(beads, "b", OFF))).toEqual(["a", "b"]);
    expect(ids(graphFor([task("t", null)], "t", OFF))).toEqual(["t"]);
  });

  it("REQ-UI-075 relationsOf lists the blockers and the blocked beads of a bead", () => {
    const beads = [epic("e-1"), epic("e-2", { blocked_by: ["e-1"] }), epic("e-3", { blocked_by: ["e-2"] })];
    const { blockers, blocked } = relationsOf(beads, "e-2");
    expect([blockers.map((b) => b.id), blocked.map((b) => b.id)]).toEqual([["e-1"], ["e-3"]]);
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
    const g = scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a"]), task("c", "e")], "e", OFF);
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

  it("REQ-UI-075 graph paths", () => {
    expect(graphPath("p q", null)).toBe("/beads/p%20q/graph");
    expect(graphPath("p", "e/1")).toBe("/beads/p/e%2F1/graph");
  });

  it("REQ-UI-076 Hide done drops a lifted arrow between two open nodes when an underlying relation has a closed end", () => {
    const beads = [
      epic("e-1"),
      epic("e-2"),
      task("a", "e-1", [], { status: "closed" }),
      task("b", "e-2", ["a"]),
    ];
    const withDone = scopeGraph(beads, null, OFF);
    expect(arrows(withDone)).toEqual(["e-1>e-2:1"]);
    const hideDone = scopeGraph(beads, null, { hideDone: true, onlyLinked: false });
    expect(arrows(hideDone)).toEqual([]);
    expect(ids(hideDone)).toEqual(["e-1", "e-2"]);
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
    const withDone = scopeGraph(beads, "e", OFF);
    expect(ids(withDone)).toEqual(["sub"]);
    const hideDone = scopeGraph(beads, "e", { hideDone: true, onlyLinked: false });
    expect(ids(hideDone)).toEqual([]);
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

  it("REQ-UI-050 cycle in neighbourhoodOf does not loop infinitely", () => {
    const beads = [task("a", null, ["b"]), task("b", null, ["a"])];
    const g = neighbourhoodOf(beads, "a", { hideDone: false });
    expect(ids(g)).toEqual(["a", "b"]);
    expect(g.cycle).toEqual(["a", "b"]);
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
