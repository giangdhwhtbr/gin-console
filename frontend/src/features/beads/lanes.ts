import type { StrandCounts } from "@/components/Strand";
import type { BeadSummary } from "./api";
import { cycleNodes, type GraphState, type Link } from "./graph";
import { leaseOf } from "./laneFacts";
import { gateState, gateTarget, gateWords, isMergeGate } from "./mergeGates";
import { countsOf } from "./progress";

/** REQ-UI-111..113: the sizes of the Lanes view in px; raise `rowH` when a lane header is taller than the row. */
export const LANE = { cardW: 184, cardH: 64, rowH: 144, gapX: 48, gapY: 32, padX: 16, padY: 32 } as const;
export const MARKER = { h: 20, wide: 84, long: 152, step: 8, clear: 4 } as const;

export type LaneStateKind = "closed" | "running" | "waiting" | "blocked" | "not_started" | "idle";
/** The graph state whose colour and icon a lane state shows (REQ-UI-112). */
export const GRAPH_STATE_OF: Record<LaneStateKind, GraphState> = {
  closed: "done",
  running: "in_progress",
  waiting: "blocked",
  blocked: "blocked",
  not_started: "ready",
  idle: "ready",
};
export type LaneState = { kind: LaneStateKind; words: string };
export type LaneCard = { bead: BeadSummary; row: number; column: number; x: number; y: number };
export type LaneRow = {
  /** `null` is the row "No lane". */
  lane: string | null;
  top: number;
  cards: LaneCard[];
  /** All the tracks of the lane, whatever the search and filters. */
  tracks: { closed: number; total: number; counts: StrandCounts };
  state: LaneState | null;
  /** Empty means "Unclaimed". */
  holders: string[];
  lease: { text: string; expired: boolean } | null;
};
export type Point = { x: number; y: number };
export type LaneArrow = { from: string; to: string; gate: BeadSummary | null; points: Point[] };
export type LaneMarker = { gate: BeadSummary; to: string; words: string; x: number; y: number; w: number };
export type LaneBoard = {
  rows: LaneRow[];
  arrows: LaneArrow[];
  markers: LaneMarker[];
  cycle: string[];
  width: number;
  height: number;
};
export type LaneKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

export type Dep = Link & { gate: BeadSummary | null };
export type Loose = { gate: BeadSummary; card: BeadSummary };

const isOpen = (bead: BeadSummary) => bead.status !== "closed";
export const laneName = (lane: string | null) => lane ?? "No lane";
export const trackNumber = (bead: BeadSummary) => bead.track?.number ?? Number.MAX_SAFE_INTEGER;

/** The children of the scope that are tracks (merge gates are not work). */
const tracksOf = (beads: readonly BeadSummary[], scopeId: string) =>
  beads.filter((b) => b.parent === scopeId && !isMergeGate(b));

/** REQ-UI-111: the scope is a bead with at least one track that has a lane. */
export const hasLanes = (beads: readonly BeadSummary[], scopeId: string | null): boolean =>
  scopeId !== null && tracksOf(beads, scopeId).some((b) => b.lane !== null);

/** The edges between `cards`: their blockers, and the track a merge gate waits for; gates whose track is not among `cards` are `loose`. */
export function depsOf(cards: readonly BeadSummary[], byId: ReadonlyMap<string, BeadSummary>): { deps: Dep[]; loose: Loose[] } {
  const inSet = new Set(cards.map((c) => c.id));
  const deps = new Map<string, Dep>();
  const loose: Loose[] = [];
  for (const card of cards) {
    for (const id of new Set(card.blocked_by)) {
      const blocker = byId.get(id);
      if (blocker === undefined) continue;
      if (isMergeGate(blocker)) {
        const target = gateTarget(blocker, cards);
        if (target === null) loose.push({ gate: blocker, card });
        else if (target.id !== card.id) deps.set(`${target.id}>${card.id}>${blocker.id}`, { from: target.id, to: card.id, gate: blocker });
      } else if (inSet.has(id) && id !== card.id) {
        deps.set(`${id}>${card.id}`, { from: id, to: card.id, gate: null });
      }
    }
  }
  return { deps: [...deps.values()], loose };
}

/** The longest path to each id; an edge that closes a cycle is ignored. */
export function depthsOf(ids: readonly string[], edges: readonly Link[]): Map<string, number> {
  const into = new Map<string, string[]>();
  for (const e of edges) into.set(e.to, [...(into.get(e.to) ?? []), e.from]);
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const visit = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    visiting.add(id);
    let longest = 0;
    for (const from of into.get(id) ?? []) if (!visiting.has(from)) longest = Math.max(longest, visit(from) + 1);
    visiting.delete(id);
    depth.set(id, longest);
    return longest;
  };
  for (const id of ids) visit(id);
  return depth;
}

/** The cards of each lane in order (dependency layer, track number, id) and the column of every card. */
function arrange(cards: readonly BeadSummary[], deps: readonly Link[]) {
  const ids = cards.map((c) => c.id);
  const layer = depthsOf(ids, deps);
  const rows = new Map<string | null, BeadSummary[]>();
  for (const card of cards) rows.set(card.lane, [...(rows.get(card.lane) ?? []), card]);
  const at = (b: BeadSummary) => layer.get(b.id) ?? 0;
  for (const list of rows.values()) list.sort((a, b) => at(a) - at(b) || trackNumber(a) - trackNumber(b) || a.id.localeCompare(b.id));
  const sequence = [...rows.values()].flatMap((list) => list.slice(1).map((c, i) => ({ from: list[i].id, to: c.id })));
  const column = depthsOf(ids, [...deps, ...sequence]);
  // only a dependency cycle can put two cards of a row on one column; the later card moves right
  for (const list of rows.values()) {
    list.forEach((card, i) => {
      const before = i === 0 ? -1 : (column.get(list[i - 1].id) ?? 0);
      if ((column.get(card.id) ?? 0) <= before) column.set(card.id, before + 1);
    });
  }
  return { rows, column };
}

/** REQ-UI-112, `docs/specs/ui/diagrams/lane-state.md`: the first rule that holds. */
export function laneState(
  tracks: readonly BeadSummary[],
  cardsInOrder: readonly BeadSummary[],
  gatesOf: (id: string) => BeadSummary[],
  now: Date,
): LaneState {
  const open = tracks.filter(isOpen);
  if (open.length === 0) return { kind: "closed", words: "All tracks closed" };
  if (open.some((t) => t.status === "in_progress" || (t.claim !== null && new Date(t.claim.expires_at) > now))) {
    return { kind: "running", words: "Running" };
  }
  const first = cardsInOrder.find(isOpen);
  if (first !== undefined) {
    const waiting = gatesOf(first.id).filter(isOpen);
    if (waiting.length > 0) {
      const lanes = [...new Set(waiting.map((g) => g.waits_for?.lane ?? "another lane"))];
      return { kind: "waiting", words: `Waiting for ${lanes.join(", ")}` };
    }
    if (first.blocked) return { kind: "blocked", words: "Blocked" };
  }
  if (!tracks.some((t) => t.status === "closed")) return { kind: "not_started", words: "Not started" };
  return { kind: "idle", words: "Idle" };
}

const columnX = (column: number) => LANE.padX + column * (LANE.cardW + LANE.gapX);
const rowTop = (row: number) => LANE.padY + row * (LANE.rowH + LANE.gapY);
/** The middle of the gap after a column, and of the gap above a row. */
const gapX = (column: number) => columnX(column) + LANE.cardW + LANE.gapX / 2;
const gapY = (row: number) => rowTop(row) - LANE.gapY / 2;

const cardTop = (row: number) => rowTop(row) + (LANE.rowH - LANE.cardH) / 2;
const middle = (card: LaneCard) => card.y + LANE.cardH / 2;

/** Removes repeated points and middle points of a straight run; a gate arrow keeps its spur (the marker sits on it). */
function simplify(points: readonly Point[], keepSpurs: boolean): Point[] {
  const list = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
  return list.filter((p, i) => {
    if (i === 0 || i === list.length - 1) return true;
    const a = list[i - 1];
    const b = list[i + 1];
    const sameX = a.x === p.x && p.x === b.x;
    const sameY = a.y === p.y && p.y === b.y;
    if (!sameX && !sameY) return true;
    const between = sameX ? (p.y - a.y) * (b.y - p.y) > 0 : (p.x - a.x) * (b.x - p.x) > 0;
    return keepSpurs && !between;
  });
}

/** REQ-UI-113: from the right middle of `a` to the left middle of `b`, only in the gaps between columns and rows. */
function route(a: LaneCard, b: LaneCard, gate: boolean): Point[] {
  const start = { x: a.x + LANE.cardW, y: middle(a) };
  const end = { x: b.x, y: middle(b) };
  if (a.row === b.row && b.column === a.column + 1 && !gate) return [start, end];
  const out = gapX(a.column);
  const into = gapX(b.column - 1);
  const over = gapY(b.row);
  return simplify([start, { x: out, y: start.y }, { x: out, y: over }, { x: into, y: over }, { x: into, y: end.y }, end], gate);
}

type Rect = { x: number; y: number; w: number; h: number };
const grown = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const onPath = (points: readonly Point[], p: Point) =>
  points.slice(1).some((q, i) => {
    const o = points[i];
    return p.x >= Math.min(o.x, q.x) && p.x <= Math.max(o.x, q.x) && p.y >= Math.min(o.y, q.y) && p.y <= Math.max(o.y, q.y);
  });
const holds = (r: Rect, p: Point) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;

/** Markers of one gap are pushed right by `MARKER.step` until none overlaps another marker or a turn of another arrow. */
function spaced(wanted: readonly { marker: LaneMarker; own: LaneArrow | null }[], arrows: readonly LaneArrow[]): LaneMarker[] {
  const placed: LaneMarker[] = [];
  for (const { marker, own } of wanted) {
    // a turn on the marker's own arrow is covered by the marker on purpose
    const turns = arrows.filter((a) => a !== own).flatMap((a) => a.points.slice(1, -1)).filter((p) => own === null || !onPath(own.points, p));
    const rect = (m: LaneMarker): Rect => ({ x: m.x, y: m.y, w: m.w, h: MARKER.h });
    let at = marker;
    for (let tries = 0; tries < 200; tries += 1) {
      const probe = grown(rect(at), MARKER.clear);
      if (!placed.some((m) => overlap(probe, rect(m))) && !turns.some((p) => holds(probe, p))) break;
      at = { ...at, x: at.x + MARKER.step };
    }
    placed.push(at);
  }
  return placed;
}

export function lanesOf(beads: readonly BeadSummary[], scopeId: string, matched: ReadonlySet<string>, now: Date): LaneBoard {
  const byId = new Map(beads.map((b) => [b.id, b]));
  const gatesOf = (id: string) => (byId.get(id)?.blocked_by ?? []).flatMap((x) => {
    const gate = byId.get(x);
    return gate !== undefined && isMergeGate(gate) ? [gate] : [];
  });
  const tracks = tracksOf(beads, scopeId);
  const whole = arrange(tracks, depsOf(tracks, byId).deps);
  const drawn = tracks.filter((b) => matched.has(b.id));
  const { deps, loose } = depsOf(drawn, byId);
  const { rows: groups, column } = arrange(drawn, deps);
  const columnOf = (id: string) => column.get(id) ?? 0;

  const lanes = [...groups.keys()].sort((a, b) => {
    if (a === null || b === null) return a === null ? (b === null ? 0 : 1) : -1;
    return columnOf(groups.get(a)?.[0]?.id ?? "") - columnOf(groups.get(b)?.[0]?.id ?? "") || a.localeCompare(b);
  });
  const rows: LaneRow[] = lanes.map((lane, row) => {
    const all = tracks.filter((t) => t.lane === lane);
    const open = all.filter(isOpen);
    const named = lane !== null;
    return {
      lane,
      top: rowTop(row),
      cards: (groups.get(lane) ?? []).map((bead) => ({ bead, row, column: columnOf(bead.id), x: columnX(columnOf(bead.id)), y: cardTop(row) })),
      tracks: { closed: all.length - open.length, total: all.length, counts: countsOf(all) },
      state: named ? laneState(all, whole.rows.get(lane) ?? [], gatesOf, now) : null,
      holders: named ? [...new Set(open.flatMap((t) => (t.assignee?.trim() ? [t.assignee.trim()] : [])))].sort() : [],
      lease: named ? leaseOf(open.map((t) => t.claim), now) : null,
    };
  });
  const cardOf = new Map(rows.flatMap((r) => r.cards.map((c) => [c.bead.id, c] as const)));

  const arrows: LaneArrow[] = [];
  const wanted: { marker: LaneMarker; own: LaneArrow | null }[] = [];
  for (const dep of deps) {
    const a = cardOf.get(dep.from);
    const b = cardOf.get(dep.to);
    if (a === undefined || b === undefined || b.column <= a.column) continue; // a cycle's back edge
    const arrow = { from: dep.from, to: dep.to, gate: dep.gate, points: route(a, b, dep.gate !== null) };
    arrows.push(arrow);
    if (dep.gate !== null) {
      const centre = (gapX(a.column) + gapX(b.column - 1)) / 2;
      wanted.push({ marker: { gate: dep.gate, to: dep.to, words: gateState(dep.gate.status), x: centre - MARKER.wide / 2, y: gapY(b.row) - MARKER.h / 2, w: MARKER.wide }, own: arrow });
    }
  }
  for (const { gate, card } of loose) {
    const b = cardOf.get(card.id);
    if (b === undefined || gate.waits_for === null) continue;
    const words = gate.status === "closed" ? `Merged track ${gate.waits_for.number}` : `Waiting for track ${gate.waits_for.number}`;
    wanted.push({ marker: { gate, to: card.id, words, x: b.x, y: gapY(b.row) - MARKER.h / 2, w: MARKER.long }, own: null });
  }
  const markers = spaced(wanted, arrows);

  const last = Math.max(-1, ...[...cardOf.values()].map((c) => c.column));
  const edge = Math.max(columnX(last) + LANE.cardW, ...markers.map((m) => m.x + m.w));
  return {
    rows,
    arrows,
    markers,
    cycle: cycleNodes(deps),
    width: rows.length === 0 ? 2 * LANE.padX : edge + LANE.padX,
    height: rows.length === 0 ? 2 * LANE.padY : rowTop(rows.length - 1) + LANE.rowH + LANE.padY,
  };
}

/** REQ-UI-114: the card after a key; left and right stay in the row, up and down go to the nearest column (the earlier on a tie). */
export function laneStep(board: LaneBoard, id: string, key: LaneKey): string | null {
  const at = board.rows.findIndex((r) => r.cards.some((c) => c.bead.id === id));
  if (at < 0) return null;
  const cards = board.rows[at].cards;
  const i = cards.findIndex((c) => c.bead.id === id);
  if (key === "ArrowLeft") return cards[i - 1]?.bead.id ?? null;
  if (key === "ArrowRight") return cards[i + 1]?.bead.id ?? null;
  const next = board.rows[at + (key === "ArrowDown" ? 1 : -1)];
  if (next === undefined) return null;
  const column = cards[i].column;
  let best: LaneCard | null = null;
  for (const c of next.cards) {
    const gap = Math.abs(c.column - column);
    if (best === null || gap < Math.abs(best.column - column) || (gap === Math.abs(best.column - column) && c.column < best.column)) best = c;
  }
  return best?.bead.id ?? null;
}

export type LaneLine = { key: string; text: string };

/** REQ-UI-114: the lines a screen reader reads, one per lane and one per merge gate, each with a stable key. */
export function laneLines(board: LaneBoard): LaneLine[] {
  const cards = new Map(board.rows.flatMap((r) => r.cards.map((c) => [c.bead.id, c.bead] as const)));
  const words = (bead: BeadSummary | undefined) =>
    bead === undefined ? "" : bead.track === null ? bead.id : `${laneName(bead.lane)} #${bead.track.number}`;
  const lanes = board.rows.map((row) => {
    const parts: string[] = [];
    if (row.state !== null) parts.push(row.state.words);
    if (row.state !== null && row.state.kind !== "closed") {
      parts.push(row.holders.length > 0 ? `held by ${row.holders.join(", ")}` : "unclaimed");
      if (row.lease !== null) parts.push(`lease ${row.lease.text}`);
    }
    parts.push(`${row.tracks.closed}/${row.tracks.total} closed`);
    return { key: `lane:${row.lane ?? ""}`, text: `${laneName(row.lane)}: ${parts.join(", ")}` };
  });
  const gates = board.markers.map((m) => {
    const from = board.arrows.find((a) => a.gate?.id === m.gate.id && a.to === m.to)?.from;
    const waits = from === undefined ? (m.gate.waits_for === null ? "" : gateWords(m.gate.waits_for)) : words(cards.get(from));
    return { key: `gate:${m.gate.id}>${m.to}`, text: `${words(cards.get(m.to))} waits for ${waits}: ${m.gate.status === "closed" ? "merged" : "merge pending"}` };
  });
  return [...lanes, ...gates];
}

/** The texts of `laneLines`. */
export const laneSummary = (board: LaneBoard): string[] => laneLines(board).map((l) => l.text);
