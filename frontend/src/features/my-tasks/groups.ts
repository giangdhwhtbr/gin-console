import type { BeadSummary } from "@/features/beads/api";
import { closedNewestFirst } from "@/features/beads/columns";
import { stateOf } from "@/features/beads/graph";
import { isMergeGate } from "@/features/beads/mergeGates";
import { isPrep } from "@/features/beads/prep";
import { personOf, samePerson } from "@/lib/people";

export type GroupKey = "mine" | "unclaimed" | "in_progress" | "blocked" | "waiting" | "closed";
export type WorkGroup = { key: GroupKey; title: string; beads: readonly BeadSummary[] };
const TITLES: Record<GroupKey, string> = {
  mine: "Assigned to me",
  unclaimed: "Unclaimed",
  in_progress: "In progress",
  blocked: "Blocked",
  waiting: "Waiting on me",
  closed: "Closed",
};
const ORDER: readonly GroupKey[] = ["mine", "unclaimed", "in_progress", "blocked", "waiting", "closed"];

/** REQ-UI-100: priority ascending, then the most recently updated, then id. */
export function compareBeads(a: BeadSummary, b: BeadSummary): number {
  return a.priority - b.priority || b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id);
}

/** REQ-UI-150: the groups of My work; the closed group is filled only from closed beads of mine. */
export function groupWork(beads: readonly BeadSummary[], email: string): WorkGroup[] {
  const known = new Map(beads.map((b) => [b.id, b]));
  const mine = (b: BeadSummary) => samePerson(b.assignee, email);
  const heldByMe = (b: BeadSummary) =>
    b.blocked_by.some((id) => {
      const blocker = known.get(id);
      return blocker !== undefined && blocker.status !== "closed" && mine(blocker);
    });
  const groups: Record<GroupKey, BeadSummary[]> = { mine: [], unclaimed: [], in_progress: [], blocked: [], waiting: [], closed: [] };
  for (const bead of beads) {
    if (bead.issue_type === "epic" || bead.issue_type === "milestone" || isMergeGate(bead)) continue;
    const key = groupOf(bead, mine(bead), heldByMe);
    if (key !== null) groups[key].push(bead);
  }
  return ORDER.map((key) => ({
    key,
    title: TITLES[key],
    beads: key === "closed" ? closedNewestFirst(groups.closed) : groups[key].sort(compareBeads),
  }));
}

function groupOf(bead: BeadSummary, mine: boolean, heldByMe: (b: BeadSummary) => boolean): GroupKey | null {
  const state = stateOf(bead);
  if (state === "done") return mine ? "closed" : null;
  if (mine) return state === "ready" ? "mine" : state === "in_progress" ? "in_progress" : state === "blocked" ? "blocked" : null;
  if (state === "blocked" && heldByMe(bead)) return "waiting";
  return state === "ready" && personOf(bead.assignee) === null && !isPrep(bead.labels) ? "unclaimed" : null;
}
