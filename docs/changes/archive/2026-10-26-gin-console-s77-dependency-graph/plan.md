# Plan: Dependency graph per scope

Epic: gin-console-s77
Spec: `docs/changes/gin-console-s77-dependency-graph/` (`proposal.md`, `spec-delta.md`, `design.md`, `tests.md`)

## Objective
The Graph tab and its epic picker are gone. A Dependencies page draws one scope at a time: the project (`/beads/<project>/graph`) or a bead (`/beads/<project>/<id>/graph`). A scope with children draws its direct children, and every blocking relation under them, at any depth, becomes an arrow between the two children that hold its ends ("n links" when several). A bead without children draws its chain of blockers and blocked beads. A double click goes down one level and Back goes up again. The breadcrumb shows the path. The canvas zooms and pans, and every right-hand panel scrolls on its own.

**Goal:** the scenarios of the added REQ-UI-075 to 081 and of the modified REQ-UI-030, 045, 048, 049, 050, 051, 052, 053, 054, 072 pass, and REQ-UI-047 is gone.
**Architecture:**
- `graph.ts` is rewritten as pure functions: holders of a scope, lifted and merged arrows, the neighbourhood, layers with the cycle guard, ordering inside a layer, top-down places.
- Two new components draw the page: `GraphCanvas.tsx` (zoom and drawing) and `GraphPage.tsx` (the page).
- A new hook `useBeads.ts` holds the load and refresh that `BeadsView` has today, so both pages share it.
- A new constant `side-panel.ts` holds the classes of the right-hand panels.
**Tech Stack:** React 19, TypeScript 6, Tailwind 4, lucide-react, vitest + Testing Library (all installed). No new dependency.

**Global Constraints (verbatim from the spec):**
- Frontend only, in `frontend/src/features/beads/`, `frontend/src/app/` and `docs/adr/`. No backend change, no new dependency (the hand-drawn SVG of ADR 0002 stays).
- Non-goals: Minimap, search inside the graph, an epic switcher, expanding a node in place (going down opens its own page), a special case for the `roadmap` label, counting an ancestor's relations as a task's own on the page of a bead without children, dragging nodes, remembering the zoom, keeping the scroll position, backend changes, a new library (React Flow stays a later option, see ADR 0002).
- `GraphPage` takes `fetchBeads(project, true)` (closed included, because the page always draws closed beads) and refreshes every 10 seconds like the other pages.
- An unknown `select` falls back to the focus bead.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`: `brainstorm`: `high_reasoning`, `design`: `high_reasoning`, `plan`: `standard_impl`, `implement`: `standard_impl`, `review`: `high_reasoning`, `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: the current Graph tab hides closed beads, needs an epic picker, is laid out left to right, has no zoom, and cannot show the order of top-level epics or go down a level. Side panels scroll the whole page.
- Success criteria:
  - A user opens the project page, sees the order of the top-level epics, and goes down into one of them, closed ones included, to read the order of its tasks without opening a bead.
  - A long bead in any side panel scrolls inside the panel.
  - `pnpm -C frontend typecheck`, `lint`, `test --run` and `build` pass.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: One scope model in `graph.ts`, one page for both routes (chosen)
- Summary: `graphFor(beads, scope, options)` returns the same `Graph` for the project, a bead with children, and a bead without children. One `GraphPage` serves both routes, and `GraphCanvas` only draws.
- Pros: every level behaves the same way, and the logic is pure and tested without the DOM.
- Cons: `graph.ts` is rewritten, not extended, and its tests are rewritten.

### Option 2: Keep `graphOf` for epics and add a separate project graph
- Summary: a second graph function and page for the top level.
- Pros: smaller first diff.
- Cons: two models that drift apart; nested epics would still be flattened.

### Recommended Approach
- Selected option: 1.
- Reasoning: it is the design confirmed in the spec; one model means one set of tests and no later rework per level.

## Scope
- In scope:
  - `frontend/src/features/beads/`:
    - new: `useBeads.ts`, `side-panel.ts`, `GraphCanvas.tsx`, `GraphPage.tsx` and their tests;
    - rewritten: `graph.ts`, `graph.test.ts`, `GraphNode.tsx`;
    - edited: `filters.ts`, `ViewTabs.tsx`, `BeadsView.tsx`, `BeadsPage.tsx`, `BeadDetailPage.tsx`, `Breadcrumb.tsx`, `ListView.tsx` and the tests that name them;
    - deleted: `GraphView.tsx`, `GraphView.test.tsx`.
  - `frontend/src/app/App.tsx` and `App.test.tsx`.
  - `tests.md` for the evidence of the manual cases.
- Out of scope: see Global Constraints. The ADR note is already written with the spec.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Four code tracks in one feature folder with shared files (graph.ts feeds the canvas and the page, the page needs the side panel and the hook), then one track only a person with a browser can finish; no independent parallel work worth a worker.
```

## Tasks

### Track 1: The scope graph engine
- **Dependencies**: none
- **Requirements**: REQ-UI-048, REQ-UI-049, REQ-UI-050, REQ-UI-052, REQ-UI-075, REQ-UI-076, REQ-UI-079, REQ-UI-081
- **Files**: rewrite `frontend/src/features/beads/graph.ts` and `graph.test.ts`. `GraphView.tsx` stops compiling after this rewrite. Track 4 deletes it, so in this track only change its import line, `graphOf`/`epicsOf` calls and step keys as far as needed to keep `tsc -b` green. Step 4 below says exactly how.
- **Provider role**: `frontend`
- **Reasoning**: `high`
- **Acceptance criteria**:
  - The scope children and the arrows lifted from relations at any depth are correct.
  - Arrows of the same pair merge and keep their list of relations.
  - A relation inside one node, or one that touches the scope bead itself, is dropped.
  - Outside beads appear on both sides.
  - Parent loops and missing parents do not hang.
  - The neighbourhood of a bead without children is transitive.
  - "Hide done" and "Only linked" behave as specified, with the number of unlinked nodes.
  - Layers use the longest path with the cycle guard, and the order inside a layer follows the barycenter.
  - Places are top-down, and the arrow keys follow the new directions.
- **Estimated complexity**: high

**Interfaces produced** (exact):
```ts
export type GraphState = "ready" | "in_progress" | "blocked" | "done" | "deferred"; // unchanged
export const STATE_LABEL: Record<GraphState, string>;                               // unchanged
export function stateOf(bead: BeadSummary): GraphState;                              // unchanged
export type Link = { from: string; to: string };                 // `from` blocks `to`
export type GraphEdge = Link & { links: Link[] };                // the relations under the nodes that make the arrow
export type GraphNode = { bead: BeadSummary; external: boolean; layer: number; order: number; done: number; total: number };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[]; cycle: string[]; unlinked: number };
export type GraphOptions = { hideDone: boolean; onlyLinked: boolean };
export type StepKey = "ArrowRight" | "ArrowLeft" | "ArrowUp" | "ArrowDown";
export const edgeKey: (edge: Link) => string;
export function graphPath(project: string, id: string | null): string;  // "/beads/p/graph" or "/beads/p/id/graph"
export function hasChildren(beads: readonly BeadSummary[], id: string): boolean;
export function progressOf(beads: readonly BeadSummary[]): Map<string, { done: number; total: number }>; // key "" = the project
export function ancestorsOf(beads: readonly BeadSummary[], id: string): string[];  // from the top
export function relationsOf(beads: readonly BeadSummary[], id: string): { blockers: BeadSummary[]; blocked: BeadSummary[] };
export function scopeGraph(beads: readonly BeadSummary[], scope: string | null, options: GraphOptions): Graph;
export function neighbourhoodOf(beads: readonly BeadSummary[], id: string, options: Pick<GraphOptions, "hideDone">): Graph;
export function graphFor(beads: readonly BeadSummary[], scope: string | null, options: GraphOptions): Graph;
export function chainOf(graph: Graph, id: string): { nodes: Set<string>; edges: Set<string> };  // unchanged body
export function step(graph: Graph, id: string, key: StepKey): string | null;
export const NODE: { w: 184; h: 64; gapX: 24; gapY: 56; pad: 16 };
export type Placed = { x: number; y: number };
export function place(graph: Graph): { at: Map<string, Placed>; width: number; height: number };
export function edgePath(from: Placed, to: Placed): string;
```
`epicsOf`, `graphOf`, `EpicRow`, `visible` and `descendantIds` are removed. `StateMark.tsx` keeps importing `STATE_LABEL`, `stateOf` and `GraphState` unchanged.

- [ ] **Step 1: Failing tests.** Replace `graph.test.ts` with:
```ts
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
});
```
- [ ] **Step 2: Run, expect FAIL** (missing exports): `pnpm -C frontend test --run src/features/beads/graph.test.ts`
- [ ] **Step 3: Rewrite `graph.ts`.** Keep lines 1–27 (imports, `GraphState`, `STATE_LABEL`, `stateOf`) as they are and replace everything after them with:
```ts
export type Link = { from: string; to: string };
export type GraphEdge = Link & { links: Link[] };
export type GraphNode = {
  bead: BeadSummary;
  external: boolean;
  layer: number;
  order: number;
  done: number;
  total: number;
};
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[]; cycle: string[]; unlinked: number };
export type GraphOptions = { hideDone: boolean; onlyLinked: boolean };
export type StepKey = "ArrowRight" | "ArrowLeft" | "ArrowUp" | "ArrowDown";

export const edgeKey = (edge: Link) => `${edge.from}>${edge.to}`;

const enc = encodeURIComponent;
export const graphPath = (project: string, id: string | null) =>
  id === null ? `/beads/${enc(project)}/graph` : `/beads/${enc(project)}/${enc(id)}/graph`;

const byImportance = (a: BeadSummary, b: BeadSummary) => a.priority - b.priority || a.id.localeCompare(b.id);
const isDone = (b: BeadSummary) => b.status === "closed";
const indexOf = (beads: readonly BeadSummary[]) => new Map(beads.map((b) => [b.id, b]));

/** The parent of a bead when it is loaded; a bead whose parent is missing counts as top-level. */
const parentOf = (byId: ReadonlyMap<string, BeadSummary>, b: BeadSummary) =>
  b.parent !== null && byId.has(b.parent) ? b.parent : null;

export const hasChildren = (beads: readonly BeadSummary[], id: string) => beads.some((b) => b.parent === id);

/** "n of m done" over the direct children of each bead; the key "" holds the beads without a parent. */
export function progressOf(beads: readonly BeadSummary[]): Map<string, { done: number; total: number }> {
  const byId = indexOf(beads);
  const counts = new Map<string, { done: number; total: number }>();
  for (const b of beads) {
    const key = parentOf(byId, b) ?? "";
    const c = counts.get(key) ?? { done: 0, total: 0 };
    counts.set(key, { done: c.done + (isDone(b) ? 1 : 0), total: c.total + 1 });
  }
  return counts;
}

/** The ancestors of a bead from the top, stopping at a parent loop. */
export function ancestorsOf(beads: readonly BeadSummary[], id: string): string[] {
  const byId = indexOf(beads);
  const up: string[] = [];
  const seen = new Set([id]);
  for (let b = byId.get(id); b !== undefined; ) {
    const parent = parentOf(byId, b);
    if (parent === null || seen.has(parent)) break;
    seen.add(parent);
    up.push(parent);
    b = byId.get(parent);
  }
  return up.reverse();
}

export function relationsOf(beads: readonly BeadSummary[], id: string) {
  const byId = indexOf(beads);
  const blockers = [...new Set(byId.get(id)?.blocked_by ?? [])].flatMap((x) => byId.get(x) ?? []);
  const blocked = beads.filter((b) => b.id !== id && b.blocked_by.includes(id));
  return { blockers: blockers.sort(byImportance), blocked: blocked.sort(byImportance) };
}

/** For each bead, the direct child of the scope (`null`: the project) that holds it, or null when it is not under the scope. */
function holders(byId: ReadonlyMap<string, BeadSummary>, scope: string | null): (id: string) => string | null {
  const memo = new Map<string, string | null>();
  return (start) => {
    const path: string[] = [];
    let found: string | null = null;
    for (let id: string | null = start; id !== null; ) {
      const known = memo.get(id);
      if (known !== undefined) {
        found = known;
        break;
      }
      const b = byId.get(id);
      if (b === undefined || path.includes(id)) break; // unknown bead or a parent loop
      path.push(id);
      const parent = parentOf(byId, b);
      if (parent === scope) {
        found = id;
        break;
      }
      id = parent;
    }
    for (const id of path) memo.set(id, found);
    return found;
  };
}

function layout(
  byId: ReadonlyMap<string, BeadSummary>,
  ids: readonly string[],
  external: ReadonlySet<string>,
  edges: readonly Link[],
  progress: ReadonlyMap<string, { done: number; total: number }>,
): Pick<Graph, "nodes" | "cycle"> {
  const blockers = new Map<string, string[]>();
  for (const e of edges) blockers.set(e.to, [...(blockers.get(e.to) ?? []), e.from]);
  const layer = new Map<string, number>();
  const stack: string[] = [];
  const cycle = new Set<string>();
  const depth = (id: string): number => {
    const known = layer.get(id);
    if (known !== undefined) return known;
    stack.push(id);
    let d = 0;
    for (const blocker of blockers.get(id) ?? []) {
      const at = stack.indexOf(blocker);
      if (at !== -1) stack.slice(at).forEach((member) => cycle.add(member));
      else d = Math.max(d, depth(blocker) + 1);
    }
    stack.pop();
    layer.set(id, d);
    return d;
  };

  const rows: BeadSummary[][] = [];
  for (const id of new Set(ids)) {
    const b = byId.get(id);
    if (b !== undefined) (rows[depth(id)] ??= []).push(b);
  }
  // ponytail: one downward barycenter sweep; add upward sweeps if large graphs still cross too much
  const order = new Map<string, number>();
  const nodes: GraphNode[] = [];
  for (const [d, row = []] of rows.entries()) {
    const bary = new Map(
      row.map((b) => {
        const at = (blockers.get(b.id) ?? []).flatMap((x) => order.get(x) ?? []);
        return [b.id, at.length === 0 ? -1 : at.reduce((sum, p) => sum + p, 0) / at.length];
      }),
    );
    row.sort((a, b) => (bary.get(a.id) ?? -1) - (bary.get(b.id) ?? -1) || byImportance(a, b));
    row.forEach((b, i) => {
      order.set(b.id, i);
      const { done, total } = progress.get(b.id) ?? { done: 0, total: 0 };
      nodes.push({ bead: b, external: external.has(b.id), layer: d, order: i, done, total });
    });
  }
  return { nodes, cycle: [...cycle].sort() };
}

export function scopeGraph(beads: readonly BeadSummary[], scope: string | null, options: GraphOptions): Graph {
  const byId = indexOf(beads);
  const holder = holders(byId, scope);
  const kept = (id: string) => {
    const b = byId.get(id);
    return b !== undefined && !(options.hideDone && isDone(b));
  };
  const merged = new Map<string, GraphEdge>();
  for (const b of beads) {
    for (const x of new Set(b.blocked_by)) {
      if (x === b.id || x === scope || b.id === scope || !kept(x) || !kept(b.id)) continue;
      const hx = holder(x);
      const hb = holder(b.id);
      if (hx === hb) continue; // inside one node, or both outside the scope
      const link = { from: hx ?? x, to: hb ?? b.id };
      if (!kept(link.from) || !kept(link.to)) continue;
      const edge = merged.get(edgeKey(link)) ?? { ...link, links: [] };
      edge.links.push({ from: x, to: b.id });
      merged.set(edgeKey(link), edge);
    }
  }
  const edges = [...merged.values()];
  const linked = new Set(edges.flatMap((e) => [e.from, e.to]));
  const inside = beads.filter((b) => holder(b.id) === b.id && kept(b.id)).map((b) => b.id);
  const shown = options.onlyLinked ? inside.filter((id) => linked.has(id)) : inside;
  const external = new Set([...linked].filter((id) => holder(id) === null));
  const { nodes, cycle } = layout(byId, [...shown, ...external], external, edges, progressOf(beads));
  return { nodes, edges, cycle, unlinked: inside.length - shown.length };
}

function reach(edges: readonly Link[], start: string, forward: boolean): Set<string> {
  const found = new Set<string>();
  const queue = [start];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    for (const e of edges) {
      const [near, far] = forward ? [e.from, e.to] : [e.to, e.from];
      if (near === id && !found.has(far)) {
        found.add(far);
        queue.push(far);
      }
    }
  }
  return found;
}

export function neighbourhoodOf(
  beads: readonly BeadSummary[],
  id: string,
  options: Pick<GraphOptions, "hideDone">,
): Graph {
  const byId = indexOf(beads);
  const kept = (x: string) => {
    const b = byId.get(x);
    return b !== undefined && (x === id || !(options.hideDone && isDone(b)));
  };
  const links = beads.flatMap((b) =>
    [...new Set(b.blocked_by)].filter((x) => x !== b.id && kept(x) && kept(b.id)).map((x) => ({ from: x, to: b.id })),
  );
  const drawn = new Set([id, ...reach(links, id, false), ...reach(links, id, true)]);
  const edges = links.filter((l) => drawn.has(l.from) && drawn.has(l.to)).map((l) => ({ ...l, links: [l] }));
  const { nodes, cycle } = layout(byId, [...drawn], new Set(), edges, progressOf(beads));
  return { nodes, edges, cycle, unlinked: 0 };
}

/** The graph of the project or of a bead with children, else the neighbourhood of the bead. */
export const graphFor = (beads: readonly BeadSummary[], scope: string | null, options: GraphOptions): Graph =>
  scope === null || hasChildren(beads, scope) ? scopeGraph(beads, scope, options) : neighbourhoodOf(beads, scope, options);

/** The node, all its direct and indirect blockers and blocked beads, and the arrows inside either side. */
export function chainOf(graph: Graph, id: string): { nodes: Set<string>; edges: Set<string> } {
  const up = new Set([id, ...reach(graph.edges, id, false)]);
  const down = new Set([id, ...reach(graph.edges, id, true)]);
  const edges = graph.edges.filter((e) => (up.has(e.from) && up.has(e.to)) || (down.has(e.from) && down.has(e.to)));
  return { nodes: new Set([...up, ...down]), edges: new Set(edges.map(edgeKey)) };
}

export function step(graph: Graph, id: string, key: StepKey): string | null {
  if (key === "ArrowDown") return graph.edges.find((e) => e.from === id)?.to ?? null;
  if (key === "ArrowUp") return graph.edges.find((e) => e.to === id)?.from ?? null;
  const node = graph.nodes.find((n) => n.bead.id === id);
  if (node === undefined) return null;
  const order = node.order + (key === "ArrowRight" ? 1 : -1);
  return graph.nodes.find((n) => n.layer === node.layer && n.order === order)?.bead.id ?? null;
}

export const NODE = { w: 184, h: 64, gapX: 24, gapY: 56, pad: 16 } as const;
export type Placed = { x: number; y: number };

export function place(graph: Graph): { at: Map<string, Placed>; width: number; height: number } {
  const at = new Map<string, Placed>();
  let columns = 0;
  let rows = 0;
  for (const n of graph.nodes) {
    at.set(n.bead.id, { x: NODE.pad + n.order * (NODE.w + NODE.gapX), y: NODE.pad + n.layer * (NODE.h + NODE.gapY) });
    columns = Math.max(columns, n.order + 1);
    rows = Math.max(rows, n.layer + 1);
  }
  return {
    at,
    width: NODE.pad * 2 + columns * NODE.w + Math.max(0, columns - 1) * NODE.gapX,
    height: NODE.pad * 2 + rows * NODE.h + Math.max(0, rows - 1) * NODE.gapY,
  };
}

/** From the bottom middle of the blocker to the top middle of the blocked node. */
export function edgePath(from: Placed, to: Placed): string {
  const x1 = from.x + NODE.w / 2;
  const y1 = from.y + NODE.h;
  const x2 = to.x + NODE.w / 2;
  const y2 = to.y;
  const mid = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
}
```
- [ ] **Step 4: Keep the old view compiling until Track 4 deletes it.** In `GraphView.tsx`:
  - change the import to `import { chainOf, edgeKey, edgePath, graphFor, place, step } from "./graph";`;
  - replace the epic list part with `const chosen = beads.find((b) => b.id === filters.epic && b.issue_type === "epic");`, and `if (chosen === undefined) return <p className="text-muted-foreground">No epics</p>;`;
  - replace the graph line with `const graph = graphFor(beads, chosen.id, { hideDone: !filters.closed, onlyLinked: false });`;
  - use `chosen.id`/`chosen.title` in the heading.

  `GraphView.test.tsx` may now fail; mark its `describe` as `describe.skip` with the comment `// removed with the Graph tab in Track 4`.
- [ ] **Step 5: Run, expect PASS:** `pnpm -C frontend test --run src/features/beads/graph.test.ts && pnpm -C frontend typecheck && pnpm -C frontend lint`
- [ ] **Step 6: Commit:** `git add -A frontend && git commit -m "feat(frontend): draw any scope with arrows lifted from the beads under its nodes"`

### Track 2: Side panels scroll on their own
- **Dependencies**: none
- **Requirements**: REQ-UI-078, REQ-UI-045
- **Files**:
  - create `frontend/src/features/beads/side-panel.ts`;
  - modify `ListView.tsx` (the `<aside>`, about line 112) and `BeadDetailPage.tsx` (the discussion column, about lines 165–177);
  - test `ListPanel.test.tsx` and `Discussion.test.tsx` (one new test each).
- **Provider role**: `frontend`
- **Reasoning**: `low`
- **Acceptance criteria**:
  - From `lg`, the List's details panel and the discussion column are sticky, at most the window height less 3rem, scroll inside, contain overscroll, can take focus and have a name.
  - Under `lg` they keep their current behaviour.
- **Estimated complexity**: low

**Interfaces produced:**
```ts
// side-panel.ts
/** REQ-UI-078: from 1024px a right-hand panel stays in view and scrolls inside itself. */
export const SIDE_PANEL =
  "lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain";
```
- [ ] **Step 1: Failing tests.** In `ListPanel.test.tsx` add (reuse its existing render helper that shows the List with a selected bead; name it as the file names it):
```tsx
it("REQ-UI-078 the details panel stays in view, scrolls by itself and takes focus", async () => {
  // render the List with select=t-1 as the other tests of this file do
  const panel = await screen.findByRole("complementary", { name: "Bead details" });
  for (const c of ["lg:sticky", "lg:max-h-[calc(100dvh-3rem)]", "lg:overflow-y-auto", "lg:overscroll-contain"]) {
    expect(panel).toHaveClass(c);
  }
  expect(panel).toHaveAttribute("tabindex", "0");
});
```
In `Discussion.test.tsx` add, with a bead with comments rendered as a page (not embedded) as the file already does:
```tsx
it("REQ-UI-078 the discussion column stays in view and scrolls by itself", async () => {
  // render <BeadDetailPage project="alpha" id="a-1" /> with comment_count > 0 as the other tests of this file do
  const column = await screen.findByRole("tabpanel", { name: /discussion/i, hidden: true });
  for (const c of ["lg:sticky", "lg:max-h-[calc(100dvh-3rem)]", "lg:overflow-y-auto", "lg:overscroll-contain"]) {
    expect(column).toHaveClass(c);
  }
  expect(column).toHaveAttribute("tabindex", "0");
});
```
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run src/features/beads/ListPanel.test.tsx src/features/beads/Discussion.test.tsx`
- [ ] **Step 3: Code.** Create `side-panel.ts` as above. Then:
  - `ListView.tsx`: import `SIDE_PANEL` and `cn` (already imported) and change the aside to `<aside aria-label="Bead details" tabIndex={0} className={cn("hidden min-w-0 rounded border p-3 lg:block", SIDE_PANEL)}>`.
  - `BeadDetailPage.tsx`: import `SIDE_PANEL` and in the discussion column replace `"lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"` with `cn("lg:block", SIDE_PANEL)`.
- [ ] **Step 4: Run, expect PASS:** `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint`
- [ ] **Step 5: Commit:** `git add -A frontend && git commit -m "feat(frontend): let the side panels stay in view and scroll by themselves"`

### Track 3: The canvas and the node
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-077, REQ-UI-049, REQ-UI-054, REQ-UI-052, REQ-UI-051
- **Files**:
  - create `frontend/src/features/beads/GraphCanvas.tsx` and `GraphCanvas.test.tsx`;
  - rewrite `GraphNode.tsx`.

  `GraphView.tsx` keeps compiling: give its `GraphNodeButton` call `onOpen={() => undefined}`.
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**:
  - Zoom in and out by 10% between 40% and 200%; Fit to view never above 100%; the canvas starts fitted.
  - `Ctrl`/`⌘` + wheel zooms, and the wheel alone does not.
  - The canvas pans with native scrolling.
  - Nodes show the card content plus "n of m done" for nodes with children, and a double click opens a node.
  - Arrows of several relations are labelled "n links".
  - The hidden list reads each arrow and the relations under it.
  - The arrow keys and Escape work, and a single node is in the tab order.
- **Estimated complexity**: medium

**Interfaces produced:**
```ts
// GraphNode.tsx
export function GraphNodeButton(props: {
  node: GraphNode; at: Placed; selected: boolean; dimmed: boolean; tabStop: boolean;
  onSelect: (id: string) => void; onOpen: (id: string) => void;
}): JSX.Element;
// GraphCanvas.tsx
export const ZOOM: { min: 0.4; max: 2; step: 0.1 };
export function fitScale(width: number, height: number, boxW: number, boxH: number): number;
export function GraphCanvas(props: {
  graph: Graph; selected: string; tabStop: string;
  onSelect: (id: string) => void; onOpen: (id: string) => void; onEscape: () => void;
}): JSX.Element;
```
- [ ] **Step 1: Failing tests** `GraphCanvas.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead } from "./beadFixtures";
import { fitScale, GraphCanvas } from "./GraphCanvas";
import { scopeGraph } from "./graph";

const OFF = { hideDone: false, onlyLinked: false };
const epic = (id: string, extra = {}) => bead(id, { issue_type: "epic", ...extra });
const task = (id: string, parent: string | null, blockedBy: string[] = [], extra = {}) =>
  bead(id, { parent, blocked_by: blockedBy, ...extra });

function box(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(height);
}

function show(graph = scopeGraph([epic("e"), task("a", "e"), task("b", "e", ["a"]), task("c", "e")], "e", OFF), selected = "") {
  const calls = { select: vi.fn(), open: vi.fn(), escape: vi.fn() };
  render(
    <GraphCanvas
      graph={graph}
      selected={selected}
      tabStop={selected || (graph.nodes[0]?.bead.id ?? "")}
      onSelect={calls.select}
      onOpen={calls.open}
      onEscape={calls.escape}
    />,
  );
  return calls;
}
const zoom = () => within(screen.getByRole("group", { name: "Zoom" }));
const node = (id: string) => screen.getByRole("button", { name: new RegExp(`^${id}`) });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GraphCanvas", () => {
  it("REQ-UI-077 Zoom out twice from 100% reads 80%", async () => {
    box(5000, 5000);
    show();
    expect(zoom().getByText("100%")).toBeInTheDocument();
    await userEvent.click(zoom().getByRole("button", { name: "Zoom out" }));
    await userEvent.click(zoom().getByRole("button", { name: "Zoom out" }));
    expect(zoom().getByText("80%")).toBeInTheDocument();
  });

  it("REQ-UI-077 stays at 40% and at 200%", async () => {
    box(1, 1);
    show();
    expect(zoom().getByText("40%")).toBeInTheDocument();
    await userEvent.click(zoom().getByRole("button", { name: "Zoom out" }));
    expect(zoom().getByText("40%")).toBeInTheDocument();
    for (let i = 0; i < 20; i++) await userEvent.click(zoom().getByRole("button", { name: "Zoom in" }));
    expect(zoom().getByText("200%")).toBeInTheDocument();
  });

  it("REQ-UI-077 starts fitted and Fit to view brings it back below 100%", async () => {
    box(300, 200);
    show();
    const first = zoom().getByText(/%$/).textContent;
    expect(Number.parseInt(first ?? "", 10)).toBeLessThan(100);
    await userEvent.click(zoom().getByRole("button", { name: "Zoom in" }));
    await userEvent.click(zoom().getByRole("button", { name: "Fit to view" }));
    expect(zoom().getByText(/%$/).textContent).toBe(first);
    expect(fitScale(100, 100, 1000, 1000)).toBe(1);
  });

  it("REQ-UI-077 the wheel zooms only with Ctrl or Cmd held", () => {
    box(5000, 5000);
    show();
    const canvas = screen.getByTestId("graph-canvas");
    fireEvent.wheel(canvas, { deltaY: -100 });
    expect(zoom().getByText("100%")).toBeInTheDocument();
    fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
    expect(zoom().getByText("110%")).toBeInTheDocument();
    fireEvent.wheel(canvas, { deltaY: 100, metaKey: true });
    expect(zoom().getByText("100%")).toBeInTheDocument();
  });

  it("REQ-UI-049 a node with children reads n of m done; a click selects and a double click opens", async () => {
    const g = scopeGraph([epic("e-1"), task("a", "e-1", [], { status: "closed" }), task("b", "e-1"), task("c", "e-1")], null, OFF);
    const calls = show(g);
    expect(node("e-1")).toHaveTextContent("1 of 3 done");
    await userEvent.click(node("e-1"));
    expect(calls.select).toHaveBeenCalledWith("e-1");
    await userEvent.dblClick(node("e-1"));
    expect(calls.open).toHaveBeenCalledWith("e-1");
  });

  it("REQ-UI-054 the hidden list reads each arrow and the relations that make it", () => {
    const g = scopeGraph([epic("e-1"), epic("e-2"), task("x", "e-1"), task("y", "e-2", ["x"]), task("z", "e-2", ["x"])], null, OFF);
    show(g);
    const list = screen.getByRole("list", { name: "Dependencies" });
    expect(within(list).getByText("e-2 is blocked by e-1")).toBeInTheDocument();
    expect(within(list).getByText("y is blocked by x")).toBeInTheDocument();
    expect(screen.getByText("2 links")).toBeInTheDocument();
  });

  it("REQ-UI-052 arrows follow the arrows, Escape asks to reselect, one node in the tab order", async () => {
    const calls = show(undefined, "a");
    expect(screen.getAllByRole("button").filter((b) => b.dataset.node && b.tabIndex === 0)).toHaveLength(1);
    node("a").focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(node("b")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(node("a")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(node("c")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(calls.escape).toHaveBeenCalled();
  });

  it("REQ-UI-051 the chain of the selected node is highlighted and the rest dimmed", () => {
    show(undefined, "b");
    expect(node("b")).toHaveAttribute("aria-pressed", "true");
    expect(node("a")).toHaveAttribute("data-dimmed", "false");
    expect(node("c")).toHaveAttribute("data-dimmed", "true");
  });
});
```
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run src/features/beads/GraphCanvas.test.tsx`
- [ ] **Step 3: `GraphNode.tsx`:**
```tsx
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE, stateOf, type GraphNode as Node, type Placed } from "./graph";
import { StateMark, stateEdge } from "./StateMark";

export function GraphNodeButton({
  node,
  at,
  selected,
  dimmed,
  tabStop,
  onSelect,
  onOpen,
}: {
  node: Node;
  at: Placed;
  selected: boolean;
  dimmed: boolean;
  tabStop: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const state = stateOf(node.bead);
  return (
    <button
      type="button"
      data-node={node.bead.id}
      data-external={node.external}
      data-dimmed={dimmed}
      aria-pressed={selected}
      tabIndex={tabStop ? 0 : -1}
      title={node.bead.title}
      onClick={() => onSelect(node.bead.id)}
      onDoubleClick={() => onOpen(node.bead.id)}
      style={{ left: at.x, top: at.y, width: NODE.w, height: NODE.h }}
      className={cn(
        "absolute flex flex-col justify-center gap-0.5 rounded border bg-card px-2 text-left text-xs transition-opacity motion-reduce:transition-none",
        stateEdge(state),
        node.external && "border-dashed opacity-60",
        dimmed && "opacity-30",
        selected && "ring-2 ring-ring",
      )}
    >
      <span className="flex items-center justify-between font-mono text-muted-foreground">
        <span>{node.bead.id}</span>
        <span>{`P${node.bead.priority}`}</span>
      </span>
      <span className="truncate text-sm font-medium text-card-foreground">{node.bead.title}</span>
      <span className="flex items-center gap-2">
        <StateMark bead={node.bead} className="text-xs" />
        {node.total > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
            <Layers aria-hidden className="size-3.5" />
            {`${node.done} of ${node.total} done`}
          </span>
        )}
      </span>
    </button>
  );
}
```
- [ ] **Step 4: `GraphCanvas.tsx`:**
```tsx
import { Minus, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GraphNodeButton } from "./GraphNode";
import { chainOf, edgeKey, edgePath, NODE, place, step, type Graph, type StepKey } from "./graph";

const KEYS: readonly StepKey[] = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"];
export const ZOOM = { min: 0.4, max: 2, step: 0.1 } as const;
const clamp = (scale: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, Math.round(scale * 100) / 100));

/** The scale that shows the whole graph in the canvas, never above 100%. */
export const fitScale = (width: number, height: number, boxW: number, boxH: number) =>
  clamp(Math.min(1, boxW / width, boxH / height));

export function GraphCanvas({
  graph,
  selected,
  tabStop,
  onSelect,
  onOpen,
  onEscape,
}: {
  graph: Graph;
  selected: string;
  tabStop: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onEscape: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const { at, width, height } = place(graph);
  const [scale, setScale] = useState(1);
  const fit = () => {
    const el = box.current;
    if (el !== null) setScale(fitScale(width, height, el.clientWidth, el.clientHeight));
  };
  // fitted once when the canvas opens; a refresh keeps the user's zoom
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(fit, []);
  useEffect(() => {
    const el = box.current;
    if (el === null) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setScale((s) => clamp(s + (event.deltaY < 0 ? ZOOM.step : -ZOOM.step)));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  const chain = at.has(selected) ? chainOf(graph, selected) : null;
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return onEscape();
    const key = KEYS.find((k) => k === event.key);
    const from = event.target instanceof HTMLElement ? event.target.dataset.node : undefined;
    if (key === undefined || from === undefined) return;
    const next = step(graph, from, key);
    if (next === null) return;
    event.preventDefault();
    Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-node]"))
      .find((el) => el.dataset.node === next)
      ?.focus();
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div role="group" aria-label="Zoom" className="flex items-center gap-2">
        <Button size="sm" variant="outline" aria-label="Zoom out" onClick={() => setScale((s) => clamp(s - ZOOM.step))}>
          <Minus aria-hidden />
        </Button>
        <span className="w-12 text-center text-sm tabular-nums">{`${Math.round(scale * 100)}%`}</span>
        <Button size="sm" variant="outline" aria-label="Zoom in" onClick={() => setScale((s) => clamp(s + ZOOM.step))}>
          <Plus aria-hidden />
        </Button>
        <Button size="sm" variant="outline" onClick={fit}>
          Fit to view
        </Button>
      </div>
      <div
        ref={box}
        data-testid="graph-canvas"
        onKeyDown={onKeyDown}
        className="h-[calc(100dvh-14rem)] min-h-80 overflow-auto overscroll-contain rounded border"
      >
        <div style={{ width: width * scale, height: height * scale }}>
          <div className="relative origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>
            <svg aria-hidden width={width} height={height} className="absolute inset-0 text-muted-foreground">
              <defs>
                <marker id="graph-arrow" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
                </marker>
              </defs>
              {graph.edges.map((edge) => {
                const from = at.get(edge.from);
                const to = at.get(edge.to);
                if (from === undefined || to === undefined) return null;
                const hot = chain?.edges.has(edgeKey(edge)) ?? false;
                const faded = chain !== null && !hot;
                return (
                  <g key={edgeKey(edge)} className={cn("transition-opacity motion-reduce:transition-none", hot && "text-foreground", faded && "opacity-30")}>
                    <path d={edgePath(from, to)} fill="none" stroke="currentColor" strokeWidth={hot ? 2 : 1} markerEnd="url(#graph-arrow)" />
                    {edge.links.length > 1 && (
                      <text
                        x={(from.x + to.x) / 2 + NODE.w / 2}
                        y={(from.y + NODE.h + to.y) / 2}
                        textAnchor="middle"
                        className="fill-current text-[10px]"
                      >
                        {`${edge.links.length} links`}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {graph.nodes.map((node) => {
              const position = at.get(node.bead.id);
              return position === undefined ? null : (
                <GraphNodeButton
                  key={node.bead.id}
                  node={node}
                  at={position}
                  selected={node.bead.id === selected}
                  dimmed={chain !== null && !chain.nodes.has(node.bead.id)}
                  tabStop={node.bead.id === tabStop}
                  onSelect={onSelect}
                  onOpen={onOpen}
                />
              );
            })}
          </div>
        </div>
      </div>
      <ul aria-label="Dependencies" className="sr-only">
        {graph.edges.map((edge) => (
          <li key={edgeKey(edge)}>
            <span>{`${edge.to} is blocked by ${edge.from}`}</span>
            {edge.links.some((l) => edgeKey(l) !== edgeKey(edge)) && (
              <ul>
                {edge.links.map((l) => (
                  <li key={edgeKey(l)}>{`${l.to} is blocked by ${l.from}`}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```
The text "2 links" sits inside an `aria-hidden` svg: in the test, query it with `screen.getByText("2 links")` (Testing Library's `getByText` ignores `aria-hidden`, so this works). If the label crosses a node in a real graph, move it to the curve's midpoint. That is a visual tweak for Track 5.
- [ ] **Step 5: Run, expect PASS:** `pnpm -C frontend test --run src/features/beads/GraphCanvas.test.tsx && pnpm -C frontend typecheck && pnpm -C frontend lint`
- [ ] **Step 6: Commit:** `git add -A frontend && git commit -m "feat(frontend): add the zoomable top-down canvas and the node with its progress"`

### Track 4: The Dependencies page, its entries and the end of the Graph tab
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-UI-030, REQ-UI-051, REQ-UI-052, REQ-UI-053, REQ-UI-072, REQ-UI-075, REQ-UI-076, REQ-UI-080, REQ-UI-081; REQ-UI-047 removed
- **Files**:
  - create `frontend/src/features/beads/useBeads.ts`, `GraphPage.tsx` and `GraphPage.test.tsx`;
  - modify `BeadsView.tsx`, `BeadsPage.tsx`, `BeadDetailPage.tsx` (the "View graph" link, about lines 128–135), `Breadcrumb.tsx`, `filters.ts`, `ViewTabs.tsx` and `frontend/src/app/App.tsx`;
  - modify the tests `filters.test.ts` (lines 52–61), `BeadDetailPage.test.tsx` (lines 407–419), `Breadcrumb.test.tsx`, `BeadsPage.test.tsx` and `frontend/src/app/App.test.tsx`;
  - delete `GraphView.tsx` and `GraphView.test.tsx`.
- **Provider role**: `frontend`
- **Reasoning**: `high`
- **Acceptance criteria**:
  - Both routes show the page; the heading bar, the two switches, the notes and the empty and error states work as in the spec.
  - The scope bead is selected at first, and nothing on the project page; `select` replaces the history entry, and going down pushes one.
  - The phone jump buttons work.
  - The breadcrumb lists the path.
  - "View dependencies" shows only when there is something to draw, and the "Dependencies" link sits next to the project picker.
  - `view=graph` shows the List, and there is no Graph tab and no `epic` parameter.
- **Estimated complexity**: high

**Interfaces produced:**
```ts
// useBeads.ts (moved verbatim from BeadsView)
export type BeadsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; beads: BeadSummary[]; error: string | null };
export function useBeads(project: string, closed: boolean): { state: BeadsState; retry: () => void };
// GraphPage.tsx
export function GraphPage(props: { project: string; id: string | null }): JSX.Element;
// Breadcrumb.tsx: `graph` = the ancestors of the scope bead from the top; with it, id "" means the project page
export function Breadcrumb(props: { project: string; id: string; parent: string | null; graph?: readonly string[] }): JSX.Element;
// filters.ts
export const VIEWS: readonly ["list", "board", "focus"]; // BeadFilters loses `epic`
```
- [ ] **Step 1: Failing tests.** `GraphPage.test.tsx`:
```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadSummary } from "./api";
import { bead, json, stubBeads } from "./beadFixtures";
import { GraphPage } from "./GraphPage";
import { clearReturn } from "./returnState";

const epic = (id: string, extra = {}) => bead(id, { issue_type: "epic", ...extra });
const task = (id: string, parent: string | null, blockedBy: string[] = [], extra = {}) =>
  bead(id, { parent, blocked_by: blockedBy, ...extra });

function open(path: string, beads: BeadSummary[] | (() => Response)) {
  window.history.replaceState(null, "", path);
  const fetchMock = stubBeads(() => (typeof beads === "function" ? beads() : json(beads)));
  const [, , project, second] = path.split("?")[0].split("/");
  render(<GraphPage project={project} id={second === "graph" ? null : decodeURIComponent(second)} />);
  return fetchMock;
}
const node = (id: string) => screen.findByRole("button", { name: new RegExp(`^${id}`) });
const panel = () => screen.getByRole("complementary", { name: "Bead details" });

beforeEach(() => clearReturn());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GraphPage", () => {
  it("REQ-UI-075 loads closed beads too", async () => {
    const fetchMock = open("/beads/p/graph", [epic("r-1")]);
    await node("r-1");
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("closed=1"))).toBe(true);
  });

  it("REQ-UI-075 an epic: heading bar with n of m done and its tasks as nodes", async () => {
    open("/beads/p/e-1/graph", [epic("e-1"), task("a", "e-1"), task("b", "e-1", ["a"])]);
    await node("a");
    const heading = screen.getByRole("region", { name: "Scope" });
    expect(within(heading).getByRole("link", { name: "e-1" })).toHaveAttribute("href", "/beads/p/e-1");
    expect(heading).toHaveTextContent("0 of 2 done");
    expect(await node("b")).toBeInTheDocument();
  });

  it("REQ-UI-075 the project draws its top-level epics", async () => {
    open("/beads/p/graph", [epic("r-1"), epic("r-2", { blocked_by: ["r-1"] }), task("a", "r-1")]);
    expect(await node("r-1")).toBeInTheDocument();
    expect(await node("r-2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^a/ })).toBeNull();
  });

  it("REQ-UI-075 the heading bar links the scope bead's blockers to their pages", async () => {
    open("/beads/p/e-2/graph", [epic("e-1"), epic("e-2", { blocked_by: ["e-1"] }), task("t", "e-2")]);
    await node("t");
    const heading = screen.getByRole("region", { name: "Scope" });
    expect(within(heading).getByRole("link", { name: /e-1/ })).toHaveAttribute("href", "/beads/p/e-1/graph");
  });

  it("REQ-UI-075 nothing to draw, empty project, not found, load error", async () => {
    open("/beads/p/t/graph", [task("t", null)]);
    expect(await screen.findByText("No dependencies")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "t" })).toHaveAttribute("href", "/beads/p/t");
    cleanup();
    open("/beads/p/graph", []);
    expect(await screen.findByText("No beads in this project")).toBeInTheDocument();
    cleanup();
    open("/beads/p/zz/graph", [task("t", null)]);
    expect(await screen.findByText("Bead not found")).toBeInTheDocument();
    cleanup();
    open("/beads/p/graph", () => json({ error: "boom" }, 500));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("REQ-UI-076 Hide done leaves out closed beads", async () => {
    open("/beads/p/e/graph", [epic("e"), task("a", "e", [], { status: "closed" }), task("b", "e", ["a"])]);
    await node("a");
    await userEvent.click(screen.getByRole("switch", { name: "Hide done" }));
    expect(screen.queryByRole("button", { name: /^a/ })).toBeNull();
    expect(await node("b")).toBeInTheDocument();
  });

  it("REQ-UI-081 Only linked is on for the project and off inside a bead", async () => {
    open("/beads/p/graph", [epic("r-1"), epic("r-2", { blocked_by: ["r-1"] }), ...["u", "v", "w", "x", "y"].map((id) => task(id, null))]);
    await node("r-1");
    expect(screen.getByRole("switch", { name: "Only linked" })).toBeChecked();
    expect(screen.getByText("5 without dependencies")).toBeInTheDocument();
    cleanup();
    open("/beads/p/e/graph", [epic("e"), task("a", "e")]);
    expect(await node("a")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Only linked" })).not.toBeChecked();
  });

  it("REQ-UI-051 the scope bead is selected at first; the project page selects nothing", async () => {
    open("/beads/p/b/graph", [task("a", null), task("b", null, ["a"])]);
    expect(await node("b")).toHaveAttribute("aria-pressed", "true");
    expect(await within(panel()).findByRole("link", { name: "Open page" })).toHaveAttribute("href", "/beads/p/b");
    cleanup();
    open("/beads/p/graph", [epic("r-1")]);
    await node("r-1");
    expect(panel()).toHaveTextContent("Select a bead to see its details");
  });

  it("REQ-UI-051 selecting replaces the history entry; an unknown select falls back", async () => {
    open("/beads/p/e/graph?select=zz", [epic("e"), task("a", "e"), task("b", "e", ["a"])]);
    await node("a");
    expect(screen.getByRole("button", { name: "Title e" })).toHaveAttribute("aria-pressed", "true");
    const before = window.history.length;
    await userEvent.click(await node("a"));
    expect(window.location.search).toBe("?select=a");
    expect(window.history.length).toBe(before);
  });

  it("REQ-UI-080 a double click goes down with a history entry", async () => {
    open("/beads/p/graph", [epic("e-1"), task("a", "e-1")]);
    const before = window.history.length;
    await userEvent.dblClick(await node("e-1"));
    expect(window.location.pathname).toBe("/beads/p/e-1/graph");
    expect(window.history.length).toBe(before + 1);
  });

  it("REQ-UI-052 under 1024px the jump buttons move along the arrows", async () => {
    open("/beads/p/b/graph?select=b", [task("a", null), task("c", null), task("b", null, ["a", "c"]), task("d", null, ["b"])]);
    await node("b");
    await userEvent.click(screen.getByRole("button", { name: "2 blockers" }));
    expect(["?select=a", "?select=c"]).toContain(window.location.search);
    expect(screen.getByRole("button", { name: "1 blocked" })).toBeInTheDocument();
  });

  it("REQ-UI-072 the breadcrumb lists the path", async () => {
    open("/beads/p/a-3/graph", [epic("a-1"), epic("a-2", { parent: "a-1" }), task("a-3", "a-2"), task("x", "a-3")]);
    const crumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(crumb.getByRole("link", { name: "Dependencies" })).toHaveAttribute("href", "/beads/p/graph");
    expect(crumb.getByRole("link", { name: "a-1" })).toHaveAttribute("href", "/beads/p/a-1/graph");
    expect(crumb.getByRole("link", { name: "a-2" })).toHaveAttribute("href", "/beads/p/a-2/graph");
    expect(crumb.getByText("a-3")).toHaveAttribute("aria-current", "page");
  });
});
```
Then edit the other tests:
- **`filters.test.ts`, lines 52–61:** replace the graph test by
```ts
  it("REQ-UI-030 old Graph links fall back to the List and lose the epic", () => {
    const filters = parseFilters("?project=a&view=graph&epic=e-1&select=t-1");
    expect(filters.view).toBe("list");
    expect(filtersToSearch(filters)).toBe("?project=a&select=t-1");
  });
```
  and change any `parseFilters("?view=graph").view` expectation to `"list"`.
- **`BeadDetailPage.test.tsx`, lines 407–419:** replace by
```tsx
  it("REQ-UI-053 View dependencies for a bead with children or a blocks relation only", async () => {
    stubFetch(beadDetail("e-1", { issue_type: "epic", children: [{ id: "t", title: "T", status: "open", type: "parent-child" }] }));
    render(<BeadDetailPage project="p" id="e-1" />);
    expect(await screen.findByRole("link", { name: "View dependencies" })).toHaveAttribute("href", "/beads/p/e-1/graph");
    cleanup();
    stubFetch(beadDetail("t-1", { dependencies: [{ id: "x", title: "X", status: "open", type: "blocks" }] }));
    render(<BeadDetailPage project="p" id="t-1" />);
    expect(await screen.findByRole("link", { name: "View dependencies" })).toBeInTheDocument();
    cleanup();
    stubFetch(beadDetail("t-2"));
    render(<BeadDetailPage project="p" id="t-2" />);
    await screen.findByText("Title t-2");
    expect(screen.queryByRole("link", { name: "View dependencies" })).toBeNull();
  });
```
  If `beadDetail` defaults `children`, `dependencies` and `dependents` to non-empty arrays, set them to `[]` in the third case.
- **`Breadcrumb.test.tsx`:** add
```tsx
  it("REQ-UI-072 the project Dependencies page ends with Dependencies", () => {
    render(<Breadcrumb project="a" id="" parent={null} graph={[]} />);
    expect(crumb().getByText("Dependencies")).toHaveAttribute("aria-current", "page");
  });
```
- **`BeadsPage.test.tsx`:** add a test that the Beads page of `alpha` has the link "Dependencies" to `/beads/alpha/graph` (REQ-UI-081), and that `?view=graph` shows the List tab pressed and no "Graph" button (REQ-UI-030).
- **`App.test.tsx`:** add a test that `/beads/alpha/graph` and `/beads/alpha/a-5/graph` render the Dependencies page (the breadcrumb contains "Dependencies") and do not request `/api/beads/alpha/graph` (REQ-UI-075).
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run src/features/beads src/app`
- [ ] **Step 3: `useBeads.ts`.** Move the `State` type (renamed `BeadsState` and exported), `REFRESH_MS`, `messageOf`, `latest`, `load`, `useVisibleInterval(load, REFRESH_MS)` and `retry` out of `BeadsView.tsx` verbatim into
```ts
export function useBeads(project: string, closed: boolean): { state: BeadsState; retry: () => void } {
  // body moved from BeadsView unchanged
  return { state, retry };
}
```
  `BeadsView` then calls `const { state, retry } = useBeads(project, filters.closed);`.
- [ ] **Step 4: Remove the Graph tab.**
  - `filters.ts`: `VIEWS = ["list", "board", "focus"] as const`, and remove `epic` from `BeadFilters`, `parseFilters` and `filtersToSearch`.
  - `ViewTabs.tsx`: `TITLES = { list: "List", board: "Board", focus: "Focus" } as const`.
  - `Breadcrumb.tsx`: `VIEW_NAME` loses `graph`.
  - `BeadsView.tsx`: remove the `GraphView` import and branch, and change the third argument of `useCardKeys` to `filters.view !== "list"`.
  - Delete `GraphView.tsx` and `GraphView.test.tsx`.
- [ ] **Step 5: `Breadcrumb.tsx`.** Add `graph?: readonly string[]` to the props, import `graphPath` from `./graph`, and replace the items after the first `<li>` with:
```tsx
        {graph === undefined ? (
          <>
            {parent !== null && (
              <li className={later}>
                <span aria-hidden>›</span>
                <Link to={`/beads/${enc(project)}/${enc(parent)}`} className="font-mono underline underline-offset-2">
                  {parent}
                </Link>
              </li>
            )}
            <li className={later}>
              <span aria-hidden>›</span>
              <span aria-current="page" className="font-mono text-foreground">
                {id}
              </span>
            </li>
          </>
        ) : (
          <>
            <li className={later}>
              <span aria-hidden>›</span>
              {id === "" ? (
                <span aria-current="page" className="text-foreground">
                  Dependencies
                </span>
              ) : (
                <Link to={graphPath(project, null)} className="underline underline-offset-2">
                  Dependencies
                </Link>
              )}
            </li>
            {id !== "" &&
              [...graph, id].map((step, i, all) => (
                <li key={step} className={later}>
                  <span aria-hidden>›</span>
                  {i === all.length - 1 ? (
                    <span aria-current="page" className="font-mono text-foreground">
                      {step}
                    </span>
                  ) : (
                    <Link to={graphPath(project, step)} className="font-mono underline underline-offset-2">
                      {step}
                    </Link>
                  )}
                </li>
              ))}
          </>
        )}
```
- [ ] **Step 6: `GraphPage.tsx`:**
```tsx
import { useState } from "react";
import { Link } from "@/app/Link";
import { navigate, useLocation } from "@/app/route";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BeadDetailPage } from "./BeadDetailPage";
import { Breadcrumb } from "./Breadcrumb";
import { GraphCanvas } from "./GraphCanvas";
import { ancestorsOf, graphFor, graphPath, hasChildren, progressOf, relationsOf } from "./graph";
import { SIDE_PANEL } from "./side-panel";
import { useBeads } from "./useBeads";

const enc = encodeURIComponent;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function GraphPage({ project, id }: { project: string; id: string | null }) {
  const { state, retry } = useBeads(project, true);
  const { search } = useLocation();
  const [hideDone, setHideDone] = useState(false);
  const [onlyLinked, setOnlyLinked] = useState(id === null);
  const beads = state.status === "ok" ? state.beads : [];
  const here = graphPath(project, id);
  const focus = id ?? "";
  const asked = new URLSearchParams(search).get("select") ?? "";
  const select = (next: string) => navigate(next === focus ? here : `${here}?select=${enc(next)}`, { replace: true });
  const open = (next: string) => navigate(graphPath(project, next));
  const errorMessage = state.status === "error" ? state.message : state.status === "ok" ? state.error : null;

  const body = () => {
    if (id !== null && !beads.some((b) => b.id === id)) return <p>Bead not found</p>;
    if (id === null && beads.length === 0) return <p>No beads in this project</p>;
    const container = id === null || hasChildren(beads, id);
    const graph = graphFor(beads, id, { hideDone, onlyLinked: container && onlyLinked });
    const known = new Set(graph.nodes.map((n) => n.bead.id));
    const selected = asked !== "" && (known.has(asked) || asked === id) ? asked : focus;
    const tabStop = known.has(selected) ? selected : (graph.nodes[0]?.bead.id ?? "");
    const inside = graph.nodes.filter((n) => !n.external).length;
    const progress = progressOf(beads).get(focus) ?? { done: 0, total: 0 };
    const scope = id === null ? null : beads.find((b) => b.id === id);
    const { blockers, blocked } = id === null ? { blockers: [], blocked: [] } : relationsOf(beads, id);
    const upstream = graph.edges.filter((e) => e.to === selected).map((e) => e.from);
    const downstream = graph.edges.filter((e) => e.from === selected).map((e) => e.to);
    const toLinks = (list: typeof blockers) =>
      list.map((b) => (
        <Link key={b.id} to={graphPath(project, b.id)} className="font-mono underline underline-offset-2">
          {b.id}
        </Link>
      ));

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          {container && (
            <section
              aria-label="Scope"
              className={cn("flex flex-col gap-1 rounded border p-3", id !== null && selected === id && "ring-2 ring-ring")}
            >
              {scope === null || scope === undefined ? (
                <h2 className="font-medium">{project}</h2>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/beads/${enc(project)}/${enc(scope.id)}`} className="font-mono underline underline-offset-2">
                    {scope.id}
                  </Link>
                  <button type="button" aria-pressed={selected === scope.id} onClick={() => select(scope.id)} className="text-left font-medium">
                    {scope.title}
                  </button>
                </div>
              )}
              <span className="text-sm text-muted-foreground">{`${progress.done} of ${progress.total} done`}</span>
              {blockers.length > 0 && <span className="flex flex-wrap gap-2 text-sm">Blocked by {toLinks(blockers)}</span>}
              {blocked.length > 0 && <span className="flex flex-wrap gap-2 text-sm">Blocks {toLinks(blocked)}</span>}
            </section>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" role="switch" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
              Hide done
            </label>
            {container && (
              <label className="flex items-center gap-2">
                <input type="checkbox" role="switch" checked={onlyLinked} onChange={(e) => setOnlyLinked(e.target.checked)} />
                Only linked
              </label>
            )}
            {graph.unlinked > 0 && <span className="text-muted-foreground">{`${graph.unlinked} without dependencies`}</span>}
          </div>
          {graph.cycle.length > 0 && (
            <p role="status" className="text-sm text-state-blocked">{`Dependency cycle between ${graph.cycle.join(", ")}`}</p>
          )}
          {!container && graph.nodes.length <= 1 ? (
            <p className="flex gap-2">
              <span>No dependencies</span>
              <Link to={`/beads/${enc(project)}/${enc(focus)}`} className="font-mono underline underline-offset-2">
                {focus}
              </Link>
            </p>
          ) : container && inside === 0 ? (
            <p className="text-muted-foreground">{graph.unlinked > 0 ? "No dependencies between these beads" : "No beads to draw"}</p>
          ) : (
            <>
              {graph.edges.length === 0 && (
                <p className="text-sm text-muted-foreground">No blocking relations between these tasks</p>
              )}
              <GraphCanvas
                graph={graph}
                selected={selected}
                tabStop={tabStop}
                onSelect={select}
                onOpen={open}
                onEscape={() => select(focus)}
              />
            </>
          )}
          {known.has(selected) && (
            <div className="flex gap-2 lg:hidden">
              {upstream.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => select(upstream[0])}>
                  {plural(upstream.length, "blocker")}
                </Button>
              )}
              {downstream.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => select(downstream[0])}>
                  {`${downstream.length} blocked`}
                </Button>
              )}
            </div>
          )}
        </div>
        <aside aria-label="Bead details" tabIndex={0} className={cn("min-w-0 rounded border p-3", SIDE_PANEL)}>
          {selected === "" ? (
            <p className="text-muted-foreground">Select a bead to see its details</p>
          ) : (
            <BeadDetailPage key={`${project}/${selected}`} project={project} id={selected} embedded />
          )}
        </aside>
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <Breadcrumb project={project} id={focus} parent={null} graph={id === null ? [] : ancestorsOf(beads, id)} />
      {state.status === "loading" && <p className="text-muted-foreground">Loading beads…</p>}
      {errorMessage !== null && (
        <Alert variant="destructive">
          <AlertTitle>Beads could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && body()}
    </section>
  );
}
```
  Notes for the implementer:
  - The panel's `BeadDetailPage` shows "View dependencies" (Step 7) for the selected bead. That link is the second way down in REQ-UI-080, and `Link` pushes a history entry.
  - The test "unknown select falls back" names the heading's title button `"Title e"` (the fixture title of `e`).
  - In the jsdom tests the window is narrow, but the jump buttons are `lg:hidden` (CSS only), so they are in the DOM and can be clicked.
- [ ] **Step 7: Entries.**
  - `BeadDetailPage.tsx`: import `buttonVariants` from `@/components/ui/button` and `graphPath` from `./graph`, then replace the epic-only "View graph" link with:
```tsx
                  {(bead.children.length > 0 ||
                    [...bead.dependencies, ...bead.dependents].some((r) => r.type === "blocks")) && (
                    <Link to={graphPath(project, bead.id)} className={cn(buttonVariants({ size: "sm" }), "self-start")}>
                      View dependencies
                    </Link>
                  )}
```
  - `BeadsPage.tsx`: import `Link` and `graphPath`, then wrap the project `<label>` in `<div className="flex flex-wrap items-center gap-3">` and add after it `<Link to={graphPath(selected, null)} className="text-sm underline underline-offset-2">Dependencies</Link>`.
  - `App.tsx`: add
```tsx
function graphRoute(pathname: string): { project: string; id: string | null } | null {
  const match = /^\/beads\/([^/]+)(?:\/([^/]+))?\/graph$/.exec(pathname);
  if (!match) return null;
  try {
    return { project: decodeURIComponent(match[1]), id: match[2] === undefined ? null : decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}
```
  Then compute `const graph = graphRoute(pathname);` and render `graph !== null ? <GraphPage key={`${graph.project}/${graph.id ?? ""}`} project={graph.project} id={graph.id} /> : ...` **before** the `bead` branch, because `beadRoute` also matches `/beads/p/graph` (as a bead named `graph`).
- [ ] **Step 8: Run, expect PASS:** `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`, and `grep -rn "GraphView\|filters.epic\|view=graph\|View graph" frontend/src` prints only the test of the old links in `filters.test.ts` and `BeadsPage.test.tsx`.
- [ ] **Step 9: Commit:** `git add -A frontend && git commit -m "feat(frontend): replace the Graph tab by a Dependencies page per scope"`

### Track 5: Look at it in a browser
- **Dependencies**: Track 4
- **Requirements**: REQ-UI-048, REQ-UI-077, REQ-UI-078, REQ-UI-080
- **Human gate**: a person with a browser looks at the live console on a laptop and a phone, in light and dark, and says what they saw. The agent has no browser; without that person the cases stay "not run".
- **Files**: modify `docs/changes/gin-console-s77-dependency-graph/tests.md` (evidence)
- **Provider role**: `frontend`
- **Reasoning**: `low`
- **Acceptance criteria**: TC-1 to TC-4 each have an evidence line that says what was seen, where, and in which theme, or "not run" with the reason.
- **Estimated complexity**: low

- [ ] **Step 1:** build and roll the result out to the running service. Back up the live `~/gin-console/frontend/dist` to `~/.cache/gin-console/dist-<stamp>`, then rsync the worktree's `frontend/dist` into it, so the person can open it.
- [ ] **Step 2 (the person):**
  - TC-1: a 50-task epic of qwikfone: Fit, zoom, Hide done, readable arrows.
  - TC-2: on a phone: zoom buttons, panning, jump buttons.
  - TC-3: a long bead at 1280px in the List and on the Dependencies page: the panel scrolls, the page does not.
  - TC-4: on gin-console: project page, the `rm-*` order, double-click down two levels, back up with Back and the breadcrumb.
- [ ] **Step 3:** write one evidence line per case in `tests.md`, then commit: `git add docs && git commit -m "docs(specs): record the manual checks of the dependency graph"`.

## Integration
- **Branch**: `feat/dependency-graph` (from `spec/dependency-graph`, which holds the spec and this plan)
- **Merge strategy**: sequential

## Validation
- [ ] All tests pass (`pnpm -C frontend test --run`; the 2100-bead limit test can time out on a loaded machine: rerun it alone before calling it a failure)
- [ ] Type checks clean (`pnpm -C frontend typecheck`), lint (`pnpm -C frontend lint`), build (`pnpm -C frontend build`)
- [ ] `grep -rn "GraphView\|epicsOf\|graphOf\|filters.epic" frontend/src` prints nothing
- [ ] `gin-workflow specs trace --change gin-console-s77` reports no missing REQ
- [ ] Manual TC-1 to TC-4 recorded in `tests.md` (Track 5, needs a person)

## Notes
- Model guidance is planning metadata, not Beads state.
- Only the Parent Bead (the epic) stays open until the human-confirmed merge; track beads close after tests and review pass.
- Tracks 1 to 4 are code only. Track 5 needs a person, so a goal that runs this epic unattended should stop after Track 4.
- Track 2 does not depend on Track 1. Running it first, or right after Track 1, is fine. Track 4 needs both.
