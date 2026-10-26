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

function cycleNodes(edges: readonly Link[]): string[] {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const outAdj = new Map<string, string[]>();
  const inAdj = new Map<string, string[]>();

  const all = new Set<string>();
  for (const e of edges) {
    all.add(e.from);
    all.add(e.to);
    outDegree.set(e.from, (outDegree.get(e.from) ?? 0) + 1);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    const outs = outAdj.get(e.from) ?? [];
    outs.push(e.to);
    outAdj.set(e.from, outs);
    const ins = inAdj.get(e.to) ?? [];
    ins.push(e.from);
    inAdj.set(e.to, ins);
  }

  const active = new Set(all);
  const queue: string[] = [];
  for (const id of active) {
    if ((inDegree.get(id) ?? 0) === 0 || (outDegree.get(id) ?? 0) === 0) {
      queue.push(id);
    }
  }

  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    if (!active.has(id)) continue;
    active.delete(id);
    for (const to of outAdj.get(id) ?? []) {
      const cur = (inDegree.get(to) ?? 0) - 1;
      inDegree.set(to, cur);
      if (cur === 0 && active.has(to)) queue.push(to);
    }
    for (const from of inAdj.get(id) ?? []) {
      const cur = (outDegree.get(from) ?? 0) - 1;
      outDegree.set(from, cur);
      if (cur === 0 && active.has(from)) queue.push(from);
    }
  }

  return [...active].sort();
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

  for (const startId of new Set(ids)) {
    if (layer.has(startId)) continue;
    const dfsStack: { id: string; blockers: readonly string[]; index: number; maxDepth: number }[] = [];
    const inStack = new Set<string>();

    dfsStack.push({ id: startId, blockers: blockers.get(startId) ?? [], index: 0, maxDepth: 0 });
    inStack.add(startId);

    while (dfsStack.length > 0) {
      const top = dfsStack[dfsStack.length - 1];
      if (top.index < top.blockers.length) {
        const blocker = top.blockers[top.index++];
        if (inStack.has(blocker)) continue;
        const known = layer.get(blocker);
        if (known !== undefined) {
          top.maxDepth = Math.max(top.maxDepth, known + 1);
        } else {
          inStack.add(blocker);
          dfsStack.push({ id: blocker, blockers: blockers.get(blocker) ?? [], index: 0, maxDepth: 0 });
        }
      } else {
        inStack.delete(top.id);
        layer.set(top.id, top.maxDepth);
        dfsStack.pop();
        if (dfsStack.length > 0) {
          const parent = dfsStack[dfsStack.length - 1];
          parent.maxDepth = Math.max(parent.maxDepth, top.maxDepth + 1);
        }
      }
    }
  }

  const rows: BeadSummary[][] = [];
  for (const id of new Set(ids)) {
    const b = byId.get(id);
    if (b !== undefined) (rows[layer.get(id) ?? 0] ??= []).push(b);
  }
  // simplified: one downward barycenter sweep; add upward sweeps if large graphs still cross too much
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
  return { nodes, cycle: cycleNodes(edges) };
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
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const [near, far] = forward ? [e.from, e.to] : [e.to, e.from];
    const list = adj.get(near);
    if (list === undefined) adj.set(near, [far]);
    else list.push(far);
  }
  const found = new Set<string>();
  const queue = [start];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    for (const far of adj.get(id) ?? []) {
      if (!found.has(far)) {
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
