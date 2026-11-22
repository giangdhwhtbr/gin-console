import { utcOf } from "@/features/milestones/format";
import type { BeadSummary } from "./api";
import { stateOf, type GraphState } from "./graph";
import { lanesOf, type LaneBoard } from "./lanes";
import { gateWords, isMergeGate } from "./mergeGates";
import { isPrep } from "./prep";

/** The legend order of the Progress bar and the order of the State column. */
export const STATE_ORDER: readonly GraphState[] = ["done", "in_progress", "ready", "blocked", "deferred"];

const isTrack = (b: BeadSummary) => !isPrep(b.labels) && !isMergeGate(b);

/** REQ-UI-120: the loaded tracks among `children` (no prep tasks, no merge gates) by state, and their points; the counts come from `progressOf`; `points` is null when no track has points. */
export function epicProgress(children: readonly BeadSummary[]): {
  byState: Record<GraphState, number>;
  points: { done: number; total: number } | null;
} {
  const tracks = children.filter(isTrack);
  const byState: Record<GraphState, number> = { ready: 0, in_progress: 0, blocked: 0, done: 0, deferred: 0 };
  for (const t of tracks) byState[stateOf(t)] += 1;
  const pointed = tracks.filter((t) => t.points !== null);
  const sum = (list: readonly BeadSummary[]) => list.reduce((n, t) => n + (t.points ?? 0), 0);
  return {
    byState,
    points: pointed.length === 0 ? null : { done: sum(pointed.filter((t) => t.status === "closed")), total: sum(pointed) },
  };
}

/** REQ-UI-121: the lane rows of the Lanes view for the whole epic. */
export function laneRows(beads: readonly BeadSummary[], epicId: string, now: Date): LaneBoard["rows"] {
  const ids = new Set(beads.filter((b) => b.parent === epicId && !isMergeGate(b)).map((b) => b.id));
  return lanesOf(beads, epicId, ids, now).rows;
}

const isWorkday = (day: Date) => day.getUTCDay() % 6 !== 0;

/** REQ-UI-120: the Mondays to Fridays from `today` to `end`, both counted; 0 when `end` is before `today`. */
export function workingDaysLeft(today: string, end: string): number {
  let count = 0;
  const last = utcOf(end).getTime();
  for (const day = utcOf(today); day.getTime() <= last; day.setUTCDate(day.getUTCDate() + 1)) {
    if (isWorkday(day)) count += 1;
  }
  return count;
}

export type TrackRow = {
  id: string;
  title: string;
  state: GraphState;
  lane: string | null;
  assignee: string | null;
  points: number | null;
  blockedBy: string[];
};

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, undefined, { numeric: true });

/** REQ-UI-121: the children of the epic that are not merge gates, by id; the open blockers by id, a merge gate as "be #2, merge pending". */
export function trackRows(beads: readonly BeadSummary[], epicId: string): TrackRow[] {
  const known = new Map(beads.map((b) => [b.id, b]));
  const blockers = (b: BeadSummary) =>
    b.blocked_by.flatMap((id) => {
      const blocker = known.get(id);
      if (blocker?.status === "closed") return [];
      return [blocker?.waits_for != null ? `${gateWords(blocker.waits_for)}, merge pending` : id];
    });
  return beads
    .filter((b) => b.parent === epicId && !isMergeGate(b))
    .sort(byId)
    .map((b) => ({ id: b.id, title: b.title, state: stateOf(b), lane: b.lane, assignee: b.assignee, points: b.points, blockedBy: blockers(b) }));
}

const compare = (a: string | number, b: string | number) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true }));

/** REQ-UI-121: the rows by `column`; a row without a value stays last in both directions, ties keep the id order. */
export function sortTracks(rows: readonly TrackRow[], column: Exclude<keyof TrackRow, "blockedBy">, direction: "ascending" | "descending"): TrackRow[] {
  const sign = direction === "ascending" ? 1 : -1;
  const key = (r: TrackRow) => (column === "state" ? STATE_ORDER.indexOf(r.state) : r[column]);
  return [...rows].sort((a, b) => {
    const x = key(a);
    const y = key(b);
    if (x === null || y === null) return Number(x === null) - Number(y === null) || byId(a, b);
    return sign * compare(x, y) || byId(a, b);
  });
}
