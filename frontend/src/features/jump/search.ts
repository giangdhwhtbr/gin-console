import type { BeadSummary } from "@/features/beads/api";
import { isMergeGate } from "@/features/beads/mergeGates";

export type Entry = { project: string; bead: BeadSummary };

const LIMIT = 20;

const byId = (a: Entry, b: Entry): number => a.bead.id.localeCompare(b.bead.id, undefined, { numeric: true });

/** REQ-UI-154: beads whose id or title contains the text; exact id, then open, then closed, then by id. */
export function searchBeads(entries: readonly Entry[], text: string): Entry[] {
  const needle = text.trim().toLowerCase();
  if (needle === "") return [];
  const rank = (e: Entry): number => (e.bead.id.toLowerCase() === needle ? 0 : e.bead.status !== "closed" ? 1 : 2);
  return entries
    .filter((e) => !isMergeGate(e.bead))
    .filter((e) => e.bead.id.toLowerCase().includes(needle) || e.bead.title.toLowerCase().includes(needle))
    .sort((a, b) => rank(a) - rank(b) || byId(a, b))
    .slice(0, LIMIT);
}
