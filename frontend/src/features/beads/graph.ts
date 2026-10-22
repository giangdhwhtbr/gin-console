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
      const ids = descendantIds(beads, epic.id);
      const tasks = shown.filter((b) => ids.has(b.id));
      return { epic, tasks: tasks.length, blocked: tasks.filter((b) => stateOf(b) === "blocked").length };
    });
}

export function graphOf(beads: readonly BeadSummary[], epicId: string, showClosed: boolean): Graph {
  const shown = visible(beads, showClosed);
  const byId = new Map(shown.map((b) => [b.id, b]));
  const descendants = descendantIds(beads, epicId);
  const inside = new Set([...descendants].filter((id) => byId.has(id)));
  const outside = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const id of inside) {
    for (const blocker of new Set(byId.get(id)?.blocked_by)) {
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
    .flatMap((id) => {
      const bead = byId.get(id);
      return bead === undefined ? [] : [{ bead, external: !inside.has(id), layer: depth(id) }];
    })
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
