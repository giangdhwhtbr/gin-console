# Plan: Beads graph view

Epic: gin-console-61l
Spec: `docs/changes/gin-console-61l-beads-graph/` (`proposal.md`, `spec-delta.md`, `design.md`)

## Objective
A fifth Beads view, **Graph**, draws one epic's descendant tasks as a layered dependency graph (arrow from blocker to blocked task, ready work on the left), highlights the chain of a selected task and opens its details beside the graph. Frontend only; no new dependency.

**Goal:** REQ-UI-047 … REQ-UI-054 and the modified REQ-UI-030 pass their scenarios.
**Architecture:** pure functions in `graph.ts` (descendants, layers, chain, keyboard step, placement); `GraphView.tsx` renders edges in one `<svg>` and nodes as absolutely positioned `<button>`s over it (so focus, click and screen readers are native); URL carries `view=graph`, `epic`, `select`.
**Tech Stack:** React 19, TypeScript 6, Tailwind 4, lucide-react, vitest + Testing Library (all already installed).

**Global Constraints (verbatim from the spec):**
- No backend change: the graph is built from `parent` and `blocked_by` of the beads the page already loads.
- No new dependency; SVG hand-drawn, layered by longest path (ADR 0002).
- Non-goals: zoom and pan, dragging nodes, a whole-project graph, the wider visual redesign (palette, shell, dark-mode toggle).
- Every colour has contrast ≥ 4.5:1 against the node background in light and dark themes; a state is never conveyed by colour alone; no animation under `prefers-reduced-motion`.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`: `brainstorm`: `high_reasoning`, `design`: `high_reasoning`, `plan`: `standard_impl`, `implement`: `standard_impl`, `review`: `high_reasoning`, `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: dependencies between tasks are invisible; the user opens each bead to learn what blocks what.
- Success criteria: from an epic's graph the user names the ready tasks, the blocked ones and their blockers without opening a bead; `pnpm -C frontend typecheck`, `lint`, `test --run`, `build` pass.
- Constraints: see Global Constraints.
- Non-goals: see Global Constraints.

## Approach Options
### Option 1: Hand-drawn layered graph (edges in SVG, nodes as HTML buttons)
- Summary: longest-path layering in a pure module, absolute-positioned buttons, one SVG for arrows.
- Pros: no bundle growth, native focus and click, themed by the existing tokens, pure logic is unit-testable.
- Cons: no zoom/pan, no edge-crossing minimisation.

### Option 2: `@xyflow/react` + `dagre`
- Summary: library renders and lays out the graph.
- Pros: zoom, pan, minimap, dragging.
- Cons: about 150 KB, two dependencies, CSS to override, features nobody asked for.

### Recommended Approach
- Selected option: 1.
- Reasoning: an epic has fewer than 30 nodes; upgrade path recorded in ADR 0002. Deviation from the discussion: nodes are HTML buttons rather than SVG `<g>`; the decision (no library, own layout) is unchanged. Highlighted arrows use the foreground colour rather than the node's state colour, to keep the contrast guarantee simple.

## Scope
- In scope: `frontend/src/features/beads/` (new `graph.ts`, `GraphNode.tsx`, `GraphView.tsx`; edits to `filters.ts`, `columns.ts`, `ViewTabs.tsx`, `BeadsView.tsx`, `BeadDetailPage.tsx`, two existing tests), `frontend/src/index.css` tokens.
- Out of scope: backend, other views, redesign of the app shell.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Three tracks that depend on each other in a chain (logic, URL and tokens, UI), all in one feature folder; no independent parallel work.
```

## Tasks

### Track 1: Graph logic
- **Dependencies**: none
- **Requirements**: REQ-UI-047, REQ-UI-048, REQ-UI-049, REQ-UI-050, REQ-UI-051, REQ-UI-052
- **Files**: create `frontend/src/features/beads/graph.ts`, `frontend/src/features/beads/graph.test.ts`; modify `frontend/src/features/beads/columns.ts:34` (export `boardColumn`)
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: the pure functions below satisfy the scenarios of REQ-UI-047/048/049/050 (data part) and the chain/step rules of REQ-UI-051/052; cycles terminate.
- **Estimated complexity**: medium

**Interfaces produced** (exact):
```ts
export type GraphState = "ready" | "in_progress" | "blocked" | "done" | "deferred";
export const STATE_LABEL: Record<GraphState, string>;
export function stateOf(bead: BeadSummary): GraphState;
export type GraphNode = { bead: BeadSummary; external: boolean; layer: number };
export type GraphEdge = { from: string; to: string }; // from = blocker, to = blocked
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[]; cycle: string[] };
export type EpicRow = { epic: BeadSummary; tasks: number; blocked: number };
export function epicsOf(beads: readonly BeadSummary[], showClosed: boolean): EpicRow[];
export function graphOf(beads: readonly BeadSummary[], epicId: string, showClosed: boolean): Graph;
export const edgeKey: (edge: GraphEdge) => string; // `${from}>${to}`
export function chainOf(graph: Graph, id: string): { nodes: Set<string>; edges: Set<string> };
export function step(graph: Graph, id: string, key: "ArrowRight" | "ArrowLeft" | "ArrowUp" | "ArrowDown"): string | null;
export const NODE: { w: 176; h: 56; gapX: 72; gapY: 16; pad: 16 };
export type Placed = { x: number; y: number };
export function place(graph: Graph): { at: Map<string, Placed>; width: number; height: number };
export function edgePath(from: Placed, to: Placed): string;
```

- [ ] **Step 1: Export `boardColumn`.** In `columns.ts` change `function boardColumn(` to `export function boardColumn(`.

- [ ] **Step 2: Write the failing test** `graph.test.ts`:
```ts
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
    expect(g.edges).toEqual([{ from: "a", to: "b" }, { from: "b", to: "c" }]);
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
    const rows = epicsOf([epic, task("a"), task("b", ["a"], { blocked: true }), task("c"), bead("e2", { issue_type: "epic" })], false);
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
    expect(at.get("b")!.x).toBeGreaterThan(at.get("a")!.x);
  });
});
```

- [ ] **Step 3: Run it, expect FAIL** (module missing): `pnpm -C frontend test --run graph.test`

- [ ] **Step 4: Write `graph.ts`:**
```ts
import type { BeadSummary } from "./api";
import { boardColumn } from "./columns";

export type GraphState = "ready" | "in_progress" | "blocked" | "done" | "deferred";
export const STATE_LABEL: Record<GraphState, string> = {
  ready: "Ready",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  deferred: "Deferred",
};

/** The board column of REQ-UI-031; an open bead that is neither ready nor blocked counts as deferred. */
export function stateOf(bead: BeadSummary): GraphState {
  switch (boardColumn(bead)) {
    case "ready":
      return "ready";
    case "in_progress":
      return "in_progress";
    case "blocked":
      return "blocked";
    case "done":
      return "done";
    default:
      return "deferred";
  }
}

export type GraphNode = { bead: BeadSummary; external: boolean; layer: number };
export type GraphEdge = { from: string; to: string };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[]; cycle: string[] };
export type EpicRow = { epic: BeadSummary; tasks: number; blocked: number };

export const edgeKey = (edge: GraphEdge) => `${edge.from}>${edge.to}`;

const visible = (beads: readonly BeadSummary[], showClosed: boolean) =>
  beads.filter((b) => showClosed || b.status !== "closed");

function descendantIds(beads: readonly BeadSummary[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const b of beads) {
    if (b.parent !== null) children.set(b.parent, [...(children.get(b.parent) ?? []), b.id]);
  }
  const found = new Set<string>();
  const queue = [rootId];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    for (const child of children.get(id) ?? []) {
      if (child !== rootId && !found.has(child)) {
        found.add(child);
        queue.push(child);
      }
    }
  }
  return found;
}

const byImportance = (a: BeadSummary, b: BeadSummary) => a.priority - b.priority || a.id.localeCompare(b.id);

export function epicsOf(beads: readonly BeadSummary[], showClosed: boolean): EpicRow[] {
  const shown = visible(beads, showClosed);
  return shown
    .filter((b) => b.issue_type === "epic")
    .sort(byImportance)
    .map((epic) => {
      const ids = descendantIds(shown, epic.id);
      const tasks = shown.filter((b) => ids.has(b.id));
      return { epic, tasks: tasks.length, blocked: tasks.filter((b) => stateOf(b) === "blocked").length };
    });
}

export function graphOf(beads: readonly BeadSummary[], epicId: string, showClosed: boolean): Graph {
  const shown = visible(beads, showClosed);
  const byId = new Map(shown.map((b) => [b.id, b]));
  const inside = descendantIds(shown, epicId);
  const outside = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const id of inside) {
    for (const blocker of byId.get(id)?.blocked_by ?? []) {
      if (blocker === id || !byId.has(blocker)) continue;
      if (!inside.has(blocker)) outside.add(blocker);
      edges.push({ from: blocker, to: id });
    }
  }

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

  const nodes = [...inside, ...outside]
    .map((id) => ({ bead: byId.get(id)!, external: !inside.has(id), layer: depth(id) }))
    .sort((a, b) => a.layer - b.layer || byImportance(a.bead, b.bead));
  return { nodes, edges, cycle: [...cycle].sort() };
}

function reach(edges: readonly GraphEdge[], start: string, forward: boolean): Set<string> {
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

/** The node, all its direct and indirect blockers and blocked beads, and the arrows inside either side. */
export function chainOf(graph: Graph, id: string): { nodes: Set<string>; edges: Set<string> } {
  const up = new Set([id, ...reach(graph.edges, id, false)]);
  const down = new Set([id, ...reach(graph.edges, id, true)]);
  const edges = graph.edges.filter((e) => (up.has(e.from) && up.has(e.to)) || (down.has(e.from) && down.has(e.to)));
  return { nodes: new Set([...up, ...down]), edges: new Set(edges.map(edgeKey)) };
}

export function step(
  graph: Graph,
  id: string,
  key: "ArrowRight" | "ArrowLeft" | "ArrowUp" | "ArrowDown",
): string | null {
  if (key === "ArrowRight") return graph.edges.find((e) => e.from === id)?.to ?? null;
  if (key === "ArrowLeft") return graph.edges.find((e) => e.to === id)?.from ?? null;
  const node = graph.nodes.find((n) => n.bead.id === id);
  if (node === undefined) return null;
  const column = graph.nodes.filter((n) => n.layer === node.layer);
  const at = column.findIndex((n) => n.bead.id === id);
  return column[at + (key === "ArrowDown" ? 1 : -1)]?.bead.id ?? null;
}

export const NODE = { w: 176, h: 56, gapX: 72, gapY: 16, pad: 16 } as const;
export type Placed = { x: number; y: number };

export function place(graph: Graph): { at: Map<string, Placed>; width: number; height: number } {
  const rows = new Map<number, number>();
  const at = new Map<string, Placed>();
  for (const n of graph.nodes) {
    const row = rows.get(n.layer) ?? 0;
    rows.set(n.layer, row + 1);
    at.set(n.bead.id, { x: NODE.pad + n.layer * (NODE.w + NODE.gapX), y: NODE.pad + row * (NODE.h + NODE.gapY) });
  }
  const columns = Math.max(0, ...rows.keys()) + 1;
  const tallest = Math.max(1, ...rows.values());
  return {
    at,
    width: NODE.pad * 2 + columns * NODE.w + (columns - 1) * NODE.gapX,
    height: NODE.pad * 2 + tallest * NODE.h + (tallest - 1) * NODE.gapY,
  };
}

export function edgePath(from: Placed, to: Placed): string {
  const x1 = from.x + NODE.w;
  const y1 = from.y + NODE.h / 2;
  const x2 = to.x;
  const y2 = to.y + NODE.h / 2;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}
```

- [ ] **Step 5: Run, expect PASS:** `pnpm -C frontend test --run graph.test` and `pnpm -C frontend typecheck`.
- [ ] **Step 6: Commit (authorised on the feature branch):** `git add frontend/src/features/beads && git commit -m "feat(frontend): add the graph logic for epic dependencies"`

### Track 2: URL, tokens and epic link
- **Dependencies**: none (independent of Track 1; run after it, sequentially)
- **Requirements**: REQ-UI-030, REQ-UI-053, REQ-UI-054
- **Files**: modify `frontend/src/features/beads/filters.ts:3-47`, `frontend/src/features/beads/filters.test.ts:55`, `frontend/src/features/beads/BoardView.test.tsx:50`, `frontend/src/features/beads/BeadDetailPage.tsx:77-84`, `frontend/src/features/beads/BeadDetailPage.test.tsx`, `frontend/src/index.css`
- **Provider role**: `frontend`
- **Reasoning**: `low`
- **Acceptance criteria**: `view=graph` parses and serialises, `epic` round-trips, `view=kanban` falls back to `list`; an epic's bead page shows "View graph" linking to `/beads?project=<p>&view=graph&epic=<id>` and a task's page does not; five state colour tokens exist for light and dark.
- **Estimated complexity**: low

**Interfaces produced:** `View` gains `"graph"`; `BeadFilters` gains `epic: string`; Tailwind colours `state-ready`, `state-progress`, `state-blocked`, `state-done`, `state-deferred`.

- [ ] **Step 1: Failing tests.** In `filters.test.ts` replace line 55 with `expect(parseFilters("?view=graph").view).toBe("graph");` and add `expect(parseFilters("?view=kanban").view).toBe("list");` next to it; add:
```ts
  it("REQ-UI-030 keeps the epic in the URL", () => {
    const filters = parseFilters("?project=a&view=graph&epic=e-1&select=t-1");
    expect(filters).toMatchObject({ view: "graph", epic: "e-1", select: "t-1" });
    expect(filtersToSearch(filters)).toBe("?project=a&view=graph&select=t-1&epic=e-1");
  });
```
(import `filtersToSearch` if the file does not already). In `BoardView.test.tsx:50` change `view=graph` to `view=kanban`. In `BeadDetailPage.test.tsx` add, using that file's `stubFetch` and `beadDetail`:
```ts
  it("REQ-UI-053 an epic links to its graph, a task does not", async () => {
    stubFetch(beadDetail("e-1", { issue_type: "epic" }));
    render(<BeadDetailPage project="p" id="e-1" />);
    expect(await screen.findByRole("link", { name: "View graph" })).toHaveAttribute(
      "href",
      "/beads?project=p&view=graph&epic=e-1",
    );
    cleanup();
    stubFetch(beadDetail("t-1"));
    render(<BeadDetailPage project="p" id="t-1" />);
    await screen.findByText("Title t-1");
    expect(screen.queryByRole("link", { name: "View graph" })).toBeNull();
  });
```
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run filters.test BeadDetailPage.test`
- [ ] **Step 3: Implement.** `filters.ts`: `VIEWS = ["list", "board", "focus", "tree", "graph"]`; add `epic: string;` to `BeadFilters` after `select`; in `parseFilters` add `epic: p.get("epic") ?? "",`; in `filtersToSearch` after the `select` line add `if (filters.epic !== "") p.set("epic", filters.epic);`. `BeadDetailPage.tsx`: in the `<header>` after the metadata `<div className="text-sm text-muted-foreground">…</div>` add
```tsx
            {bead.issue_type === "epic" && (
              <Link
                to={`/beads?project=${encodeURIComponent(project)}&view=graph&epic=${encodeURIComponent(bead.id)}`}
                className="text-sm underline underline-offset-2"
              >
                View graph
              </Link>
            )}
```
`index.css`: inside `@theme inline {` add
```css
    --color-state-ready: var(--state-ready);
    --color-state-progress: var(--state-progress);
    --color-state-blocked: var(--state-blocked);
    --color-state-done: var(--state-done);
    --color-state-deferred: var(--state-deferred);
```
in `:root {` add `--state-ready: #0f766e; --state-progress: #4338ca; --state-blocked: #b45309; --state-done: #6b7280; --state-deferred: #6b7280;` and in `.dark {` add `--state-ready: #2dd4bf; --state-progress: #a5b4fc; --state-blocked: #fbbf24; --state-done: #9ca3af; --state-deferred: #9ca3af;` (one declaration per line as the file does).
- [ ] **Step 4: Run, expect PASS:** `pnpm -C frontend test --run && pnpm -C frontend typecheck` (fix any `BeadFilters` literal the compiler flags by adding `epic: ""`).
- [ ] **Step 5: Commit:** `git add frontend && git commit -m "feat(frontend): add the graph view parameter, state colours and epic link"`

### Track 3: Graph view
- **Dependencies**: Track 1, Track 2
- **Requirements**: REQ-UI-030, REQ-UI-047, REQ-UI-048, REQ-UI-049, REQ-UI-050, REQ-UI-051, REQ-UI-052, REQ-UI-054
- **Files**: create `frontend/src/features/beads/GraphNode.tsx`, `frontend/src/features/beads/GraphView.tsx`, `frontend/src/features/beads/GraphView.test.tsx`; modify `frontend/src/features/beads/ViewTabs.tsx:4`, `frontend/src/features/beads/BeadsView.tsx:30-31,71-78`
- **Provider role**: `frontend`
- **Reasoning**: `high`
- **Acceptance criteria**: the scenarios of REQ-UI-030 (Graph view), 047, 048 (UI part), 049, 050, 051, 052 and 054 pass in `GraphView.test.tsx`; light and dark contrast checked by hand (TC-1).
- **Estimated complexity**: high

**Interfaces consumed:** everything from Track 1; `BeadFilters.epic`; `BeadDetailPage` with `embedded`. **Produced:** `GraphView({ project, beads, filters, onChange })`.

- [ ] **Step 1: Failing tests** `GraphView.test.tsx` (pattern of `TreeView.test.tsx`):
```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bead, json, stubBeads } from "./beadFixtures";
import { BeadsPage } from "./BeadsPage";

beforeEach(() => window.history.replaceState(null, "", "/beads"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const epic = bead("e-1", { issue_type: "epic", title: "Epic One" });
const task = (id: string, blockedBy: string[] = [], extra = {}) =>
  bead(id, { parent: "e-1", blocked_by: blockedBy, title: `Task ${id}`, ...extra });
const open = (search: string, beads: ReturnType<typeof bead>[]) => {
  window.history.replaceState(null, "", `/beads?project=alpha&view=graph${search}`);
  stubBeads(() => json(beads));
  render(<BeadsPage />);
};

describe("GraphView", () => {
  it("REQ-UI-030 Graph tab switches the view and keeps the URL", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([epic]));
    render(<BeadsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Graph" }));
    expect(window.location.search).toContain("view=graph");
  });

  it("REQ-UI-047 lists epics with counts", async () => {
    open("", [epic, task("a"), task("b", ["a"], { blocked: true }), bead("e-2", { issue_type: "epic", title: "Empty" })]);
    const row = await screen.findByRole("button", { name: /Epic One/ });
    expect(row).toHaveTextContent("2 tasks");
    expect(row).toHaveTextContent("1 blocked");
    expect(screen.getByRole("button", { name: /Empty/ })).toHaveTextContent("0 tasks");
  });

  it("REQ-UI-047 an epic parameter that is a task shows the epics", async () => {
    open("&epic=a", [epic, task("a")]);
    expect(await screen.findByRole("button", { name: /Epic One/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("REQ-UI-048 REQ-UI-049 draws nodes with id, priority and state label", async () => {
    open("&epic=e-1", [epic, task("a", [], { ready: true, priority: 1 }), task("b", ["a"], { blocked: true })]);
    const a = await screen.findByRole("button", { name: /Task a/ });
    expect(a).toHaveTextContent("a");
    expect(a).toHaveTextContent("P1");
    expect(a).toHaveTextContent("Ready");
    expect(screen.getByRole("button", { name: /Task b/ })).toHaveTextContent("Blocked");
  });

  it("REQ-UI-048 says so when the epic has no tasks or no relations", async () => {
    open("&epic=e-1", [epic]);
    expect(await screen.findByText("This epic has no tasks")).toBeInTheDocument();
    cleanup();
    open("&epic=e-1", [epic, task("a"), task("b")]);
    expect(await screen.findByText("No blocking relations between these tasks")).toBeInTheDocument();
  });

  it("REQ-UI-050 draws an outside blocker and warns about a cycle", async () => {
    open("&epic=e-1", [epic, task("t-1", ["x-9"]), bead("x-9", { title: "Elsewhere", parent: "other" })]);
    expect(await screen.findByRole("button", { name: /Elsewhere/ })).toHaveAttribute("data-external", "true");
    cleanup();
    open("&epic=e-1", [epic, task("a", ["b"]), task("b", ["a"])]);
    expect(await screen.findByText("Dependency cycle between a, b")).toBeInTheDocument();
  });

  it("REQ-UI-054 lists every arrow as text", async () => {
    open("&epic=e-1", [epic, task("a"), task("b", ["a"])]);
    await screen.findByRole("button", { name: /Task a/ });
    expect(screen.getByText("b is blocked by a")).toBeInTheDocument();
  });

  it("REQ-UI-051 selecting keeps select in the URL and highlights the chain", async () => {
    open("&epic=e-1", [epic, task("a"), task("b", ["a"]), task("z")]);
    await userEvent.click(await screen.findByRole("button", { name: /Task b/ }));
    expect(window.location.search).toContain("select=b");
    expect(screen.getByRole("button", { name: /Task a/ })).toHaveAttribute("data-dimmed", "false");
    expect(screen.getByRole("button", { name: /Task z/ })).toHaveAttribute("data-dimmed", "true");
    expect(screen.getByRole("complementary", { name: "Bead details" })).toBeInTheDocument();
  });

  it("REQ-UI-051 restores the selection from the URL", async () => {
    open("&epic=e-1&select=b", [epic, task("a"), task("b", ["a"])]);
    expect(await screen.findByRole("button", { name: /Task b/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("REQ-UI-052 arrows follow edges and Escape clears", async () => {
    open("&epic=e-1&select=a", [epic, task("a"), task("b", ["a"])]);
    const a = await screen.findByRole("button", { name: /Task a/ });
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: /Task b/ })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(window.location.search).not.toContain("select=");
    expect(within(screen.getByRole("complementary", { name: "Bead details" })).getByText("Select a bead to see its details")).toBeInTheDocument();
  });
});
```
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run GraphView.test`
- [ ] **Step 3: `GraphNode.tsx`:**
```tsx
import { Ban, Check, CircleCheck, CircleDot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE, STATE_LABEL, stateOf, type GraphNode as Node, type GraphState, type Placed } from "./graph";

const ICON = { ready: CircleCheck, in_progress: CircleDot, blocked: Ban, done: Check, deferred: Clock } as const;
const TONE: Record<GraphState, string> = {
  ready: "border-l-state-ready text-state-ready",
  in_progress: "border-l-state-progress text-state-progress",
  blocked: "border-l-state-blocked text-state-blocked",
  done: "border-l-state-done text-state-done",
  deferred: "border-l-state-deferred text-state-deferred",
};

export function GraphNodeButton({
  node,
  at,
  selected,
  dimmed,
  tabStop,
  onSelect,
}: {
  node: Node;
  at: Placed;
  selected: boolean;
  dimmed: boolean;
  tabStop: boolean;
  onSelect: (id: string) => void;
}) {
  const state = stateOf(node.bead);
  const Icon = ICON[state];
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
      style={{ left: at.x, top: at.y, width: NODE.w, height: NODE.h }}
      className={cn(
        "absolute flex flex-col justify-center gap-0.5 rounded border border-l-4 bg-card px-2 text-left text-xs transition-opacity motion-reduce:transition-none",
        TONE[state],
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
      <span className="flex items-center gap-1">
        <Icon aria-hidden className="size-3" />
        {STATE_LABEL[state]}
      </span>
    </button>
  );
}
```
- [ ] **Step 4: `GraphView.tsx`:**
```tsx
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import type { BeadSummary } from "./api";
import { BeadDetailPage } from "./BeadDetailPage";
import type { BeadFilters } from "./filters";
import { GraphNodeButton } from "./GraphNode";
import { chainOf, edgeKey, edgePath, epicsOf, graphOf, place, step } from "./graph";

const KEYS = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"] as const;

export function GraphView({
  project,
  beads,
  filters,
  onChange,
}: {
  project: string;
  beads: readonly BeadSummary[];
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
}) {
  const epics = epicsOf(beads, filters.closed);
  const chosen = epics.find((row) => row.epic.id === filters.epic);

  if (chosen === undefined) {
    return epics.length === 0 ? (
      <p className="text-muted-foreground">No epics</p>
    ) : (
      <ul aria-label="Epics" className="flex flex-col gap-2">
        {epics.map(({ epic, tasks, blocked }) => (
          <li key={epic.id}>
            <Button
              variant="outline"
              className="h-auto w-full justify-start gap-3 py-2"
              onClick={() => onChange({ ...filters, epic: epic.id, select: "" })}
            >
              <span className="font-mono">{epic.id}</span>
              <span>{epic.title}</span>
              <span className="ml-auto text-muted-foreground">{`${tasks} tasks · ${blocked} blocked`}</span>
            </Button>
          </li>
        ))}
      </ul>
    );
  }

  const graph = graphOf(beads, chosen.epic.id, filters.closed);
  const { at, width, height } = place(graph);
  const chain = filters.select === "" || !at.has(filters.select) ? null : chainOf(graph, filters.select);
  const tabStop = at.has(filters.select) ? filters.select : graph.nodes[0]?.bead.id;
  const select = (id: string) => onChange({ ...filters, select: id });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return select("");
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => onChange({ ...filters, epic: "", select: "" })}>
            All epics
          </Button>
          <h2 className="font-medium">{`${chosen.epic.id} ${chosen.epic.title}`}</h2>
        </div>
        {graph.cycle.length > 0 && (
          <p role="status" className="text-sm text-state-blocked">{`Dependency cycle between ${graph.cycle.join(", ")}`}</p>
        )}
        {graph.nodes.length === 0 ? (
          <p className="text-muted-foreground">This epic has no tasks</p>
        ) : (
          <>
            {graph.edges.length === 0 && (
              <p className="text-sm text-muted-foreground">No blocking relations between these tasks</p>
            )}
            <div className="overflow-x-auto rounded border" onKeyDown={onKeyDown}>
              <div className="relative" style={{ width, height }}>
                <svg aria-hidden width={width} height={height} className="absolute inset-0 text-muted-foreground">
                  <defs>
                    <marker id="graph-arrow" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6" orient="auto">
                      <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {graph.edges.map((edge) => {
                    const hot = chain?.edges.has(edgeKey(edge)) ?? false;
                    return (
                      <path
                        key={edgeKey(edge)}
                        d={edgePath(at.get(edge.from)!, at.get(edge.to)!)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={hot ? 2 : 1}
                        markerEnd="url(#graph-arrow)"
                        className={`transition-opacity motion-reduce:transition-none ${hot ? "text-foreground" : chain ? "opacity-30" : ""}`}
                      />
                    );
                  })}
                </svg>
                {graph.nodes.map((node) => (
                  <GraphNodeButton
                    key={node.bead.id}
                    node={node}
                    at={at.get(node.bead.id)!}
                    selected={node.bead.id === filters.select}
                    dimmed={chain !== null && !chain.nodes.has(node.bead.id)}
                    tabStop={node.bead.id === tabStop}
                    onSelect={select}
                  />
                ))}
              </div>
            </div>
            <ul className="sr-only">
              {graph.edges.map((edge) => (
                <li key={edgeKey(edge)}>{`${edge.to} is blocked by ${edge.from}`}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <aside aria-label="Bead details" className="min-w-0 rounded border p-3">
        {filters.select === "" ? (
          <p className="text-muted-foreground">Select a bead to see its details</p>
        ) : (
          <BeadDetailPage key={`${project}/${filters.select}`} project={project} id={filters.select} embedded />
        )}
      </aside>
    </div>
  );
}
```
- [ ] **Step 5: Wire the tab and the view.** `ViewTabs.tsx`: `const TITLES = { list: "List", board: "Board", focus: "Focus", tree: "Tree", graph: "Graph" } as const;`. `BeadsView.tsx`: add `import { GraphView } from "./GraphView";`; change `useCardKeys(filters.view !== "list", clearSearch, filters.view !== "tree");` to `useCardKeys(filters.view !== "list", clearSearch, filters.view !== "tree" && filters.view !== "graph");`; after the Tree block add
```tsx
          {filters.view === "graph" && (
            <GraphView project={project} beads={beads} filters={filters} onChange={onChange} />
          )}
```
- [ ] **Step 6: Run, expect PASS:** `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`.
- [ ] **Step 7: Manual TC-1** (`tests.md`): `pnpm -C frontend dev`, open `/beads?project=<p>&view=graph&epic=<epic>` in light and dark themes (toggle `.dark` on `<html>` in devtools); every state is readable by icon and label alone and text meets 4.5:1.
- [ ] **Step 8: Commit:** `git add frontend && git commit -m "feat(frontend): add the Beads graph view"`

## Integration
- **Branch**: `feat/beads-graph-view` (from the updated base after the spec change is merged or alongside it)
- **Merge strategy**: sequential

## Validation
- [ ] All tests pass (`pnpm -C frontend test --run`)
- [ ] Type checks clean (`pnpm -C frontend typecheck`) and lint (`pnpm -C frontend lint`), build (`pnpm -C frontend build`)
- [ ] Manual TC-1 in light and dark themes
- [ ] `gin-workflow specs trace --change gin-console-61l` reports no missing REQ

## Notes
- Model guidance is planning metadata, not Beads state.
- Only the Parent Bead (the epic) stays open until the human-confirmed merge; track beads close after tests and review pass.
