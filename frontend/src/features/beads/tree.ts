import type { BeadSummary } from "./api";

export const TREE_LIMIT = 2000;
const WALK_LIMIT = 100_000; // ponytail: a pathological DAG stops being counted here; the count then reads "N+ more"

export type TreeMode = "hierarchy" | "blocking";

export type TreeIndex = {
  mode: TreeMode;
  byId: ReadonlyMap<string, BeadSummary>;
  roots: readonly BeadSummary[];
  kids: ReadonlyMap<string, readonly BeadSummary[]>;
  parents: ReadonlyMap<string, readonly string[]>;
};

export type TreeRow = {
  key: string; // the ids from the root down, unique even when a bead shows in several places
  bead: BeadSummary;
  level: number;
  hasKids: boolean;
  open: boolean;
  repeated: boolean; // already above on this branch: shown as a leaf
  totalKids: number;
  closedKids: number;
  blockers: number; // loaded beads that block this one
};

export type TreeRows = { rows: TreeRow[]; omitted: number; walkLimited: boolean };

const time = (text: string) => Date.parse(text) || 0;
const byImportance = (a: BeadSummary, b: BeadSummary) =>
  a.priority - b.priority || time(b.updated_at) - time(a.updated_at);

const push = (map: Map<string, string[]>, key: string, value: string) => {
  const list = map.get(key);
  if (list === undefined) map.set(key, [value]);
  else list.push(value);
};

/** Index the beads as a forest: by `parent` (hierarchy) or by `blocked_by` (blocking). */
export function treeIndex(beads: readonly BeadSummary[], mode: TreeMode): TreeIndex {
  const byId = new Map(beads.map((b) => [b.id, b]));
  const kidIds = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const bead of beads) {
    const upstream = mode === "hierarchy" ? (bead.parent === null ? [] : [bead.parent]) : bead.blocked_by;
    for (const id of new Set(upstream)) {
      if (id === bead.id || !byId.has(id)) continue;
      push(kidIds, id, bead.id);
      push(parents, bead.id, id);
    }
  }
  const kids = new Map<string, BeadSummary[]>();
  for (const [id, childIds] of kidIds) {
    kids.set(
      id,
      childIds.flatMap((childId) => byId.get(childId) ?? []).sort(byImportance),
    );
  }

  const shown = beads.filter((b) => mode === "hierarchy" || kids.has(b.id)).sort(byImportance);
  const roots = shown.filter((b) => !parents.has(b.id));
  const reached = new Set<string>();
  const reach = (start: BeadSummary) => {
    const stack = [start.id];
    for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
      if (reached.has(id)) continue;
      reached.add(id);
      for (const child of kids.get(id) ?? []) stack.push(child.id);
    }
  };
  roots.forEach(reach);
  // beads on a cycle all have a parent: start from the first one nobody reached
  for (const bead of shown) {
    if (!reached.has(bead.id)) {
      roots.push(bead);
      reach(bead);
    }
  }
  return { mode, byId, roots, kids, parents };
}

/** The ids of the beads that have children: "Expand all". */
export function allBranches(index: TreeIndex): Set<string> {
  return new Set(index.kids.keys());
}

/** The ids reached by walking up from `ids`, the ids themselves included. */
export function keepSet(index: TreeIndex, ids: ReadonlySet<string>): Set<string> {
  const keep = new Set<string>();
  const stack = [...ids].filter((id) => index.byId.has(id));
  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    if (keep.has(id)) continue;
    keep.add(id);
    stack.push(...(index.parents.get(id) ?? []));
  }
  return keep;
}

/** The ancestors of a bead, not the bead itself. */
export function ancestorsOf(index: TreeIndex, id: string): Set<string> {
  const above = keepSet(index, new Set([id]));
  above.delete(id);
  return above;
}

/** The rows to show: open branches only, at most TREE_LIMIT, optionally only the beads in `keep`. */
export function treeRows(
  index: TreeIndex,
  open: ReadonlySet<string>,
  keep: ReadonlySet<string> | null,
): TreeRows {
  const rows: TreeRow[] = [];
  let omitted = 0;
  let steps = 0;
  let walkLimited = false;

  const visit = (bead: BeadSummary, level: number, path: readonly string[]) => {
    if (steps >= WALK_LIMIT) {
      walkLimited = true;
      return;
    }
    steps += 1;
    const repeated = path.includes(bead.id);
    const all = repeated ? [] : (index.kids.get(bead.id) ?? []);
    const shownKids = keep === null ? all : all.filter((k) => keep.has(k.id));
    const isOpen = shownKids.length > 0 && open.has(bead.id);
    if (rows.length < TREE_LIMIT) {
      rows.push({
        key: [...path, bead.id].join("/"),
        bead,
        level,
        hasKids: shownKids.length > 0,
        open: isOpen,
        repeated,
        totalKids: all.length,
        closedKids: all.filter((k) => k.status === "closed").length,
        blockers: new Set(bead.blocked_by.filter((id) => index.byId.has(id) && id !== bead.id)).size,
      });
    } else {
      omitted += 1;
    }
    if (isOpen) for (const child of shownKids) visit(child, level + 1, [...path, bead.id]);
  };

  for (const root of index.roots) if (keep === null || keep.has(root.id)) visit(root, 0, []);
  return { rows, omitted, walkLimited };
}
