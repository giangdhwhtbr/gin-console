import type { BeadSummary } from "./api";

export const TREE_LIMIT = 2000;
const WALK_LIMIT = 100_000; // ponytail: a pathological DAG stops being counted here; the count then reads "N+ more"

export type TreeIndex = {
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
  totalKids: number;
  closedKids: number;
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

/** Index the beads as a forest by `parent`. */
export function treeIndex(beads: readonly BeadSummary[]): TreeIndex {
  const byId = new Map(beads.map((b) => [b.id, b]));
  const kidIds = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const bead of beads) {
    const parent = bead.parent;
    if (parent === null || parent === bead.id || !byId.has(parent)) continue;
    push(kidIds, parent, bead.id);
    push(parents, bead.id, parent);
  }
  const kids = new Map<string, BeadSummary[]>();
  for (const [id, childIds] of kidIds) {
    kids.set(
      id,
      childIds.flatMap((childId) => byId.get(childId) ?? []).sort(byImportance),
    );
  }

  const shown = [...beads].sort(byImportance);
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
  return { byId, roots, kids, parents };
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
    if (path.includes(bead.id)) return; // a parent cycle: every bead shows once
    if (steps >= WALK_LIMIT) {
      walkLimited = true;
      return;
    }
    steps += 1;
    const all = index.kids.get(bead.id) ?? [];
    const shownKids = keep === null ? all : all.filter((k) => keep.has(k.id));
    const isOpen = shownKids.length > 0 && open.has(bead.id);
    if (rows.length < TREE_LIMIT) {
      rows.push({
        key: [...path, bead.id].join("/"),
        bead,
        level,
        hasKids: shownKids.length > 0,
        open: isOpen,
        totalKids: all.length,
        closedKids: all.filter((k) => k.status === "closed").length,
      });
    } else {
      omitted += 1;
    }
    if (isOpen) for (const child of shownKids) visit(child, level + 1, [...path, bead.id]);
  };

  for (const root of index.roots) if (keep === null || keep.has(root.id)) visit(root, 0, []);
  return { rows, omitted, walkLimited };
}
