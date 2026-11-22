import { toStrandCounts, type StrandCounts } from "@/components/Strand";
import type { BeadSummary } from "./api";
import { stateOf, type GraphState } from "./graph";

export type Progress = { done: number; total: number; prepDone: number; prepTotal: number; counts: StrandCounts };

/** REQ-UI-130: tracks and prep tasks closed over every direct child of the bead, whatever the filters (merge gates are not counted). */
export function progressOf(bead: Pick<BeadSummary, "child_counts">): Progress {
  const c = bead.child_counts;
  return { done: c.closed, total: c.total, prepDone: c.prep_closed, prepTotal: c.prep_total, counts: toStrandCounts(c) };
}

const COUNT_OF: Record<GraphState, keyof StrandCounts> = { done: "done", in_progress: "inProgress", blocked: "blocked", ready: "ready", deferred: "deferred" };

/** REQ-UI-112: the strand counts of a lane's tracks, by their state. */
export function countsOf(beads: readonly BeadSummary[]): StrandCounts {
  const counts: StrandCounts = { done: 0, inProgress: 0, blocked: 0, ready: 0, deferred: 0 };
  for (const b of beads) {
    counts[COUNT_OF[stateOf(b)]] += 1;
  }
  return counts;
}

/** The Prep count of the Beads views and the bead page. */
export const prepLabel = (p: Progress): string => `Prep ${p.prepDone}/${p.prepTotal}`;

/** The Prep count of the PM views. */
export const prepWords = (p: Progress): string => `Prep ${p.prepDone} of ${p.prepTotal} done`;
