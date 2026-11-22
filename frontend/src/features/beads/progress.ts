import type { BeadSummary } from "./api";

export type Progress = { done: number; total: number; prepDone: number; prepTotal: number };

/** REQ-UI-130: tracks and prep tasks closed over every direct child of the bead, whatever the filters (merge gates are not counted). */
export function progressOf(bead: Pick<BeadSummary, "child_counts">): Progress {
  const c = bead.child_counts;
  return { done: c.closed, total: c.total, prepDone: c.prep_closed, prepTotal: c.prep_total };
}

/** The Prep count of the Beads views and the bead page. */
export const prepLabel = (p: Progress): string => `Prep ${p.prepDone}/${p.prepTotal}`;

/** The Prep count of the PM views. */
export const prepWords = (p: Progress): string => `Prep ${p.prepDone} of ${p.prepTotal} done`;
