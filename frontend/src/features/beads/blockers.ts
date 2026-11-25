import { samePerson } from "@/lib/people";
import type { BeadDetail, BeadSummary, GateRef, Relation } from "./api";
import { gateWords } from "./mergeGates";

const byId = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** REQ-UI-152: the open blockers of a bead, by id. */
export function openBlockers(bead: Pick<BeadDetail, "dependencies">): Relation[] {
  return bead.dependencies.filter((d) => d.type === "blocks" && d.status !== "closed").sort((a, b) => byId(a.id, b.id));
}

/** A blocker's name: its title, or for a merge gate (whose title is a path) its gate words and ", merge pending". */
export function blockerLabel(bead: { title: string; waits_for?: GateRef | null }): string {
  return bead.waits_for != null ? `${gateWords(bead.waits_for)}, merge pending` : bead.title;
}

/** REQ-UI-100: the first open blocker by id and how many more; a blocker missing from `known` counts as open and is named by its id. */
export function blockerSummary(
  bead: Pick<BeadSummary, "blocked_by">,
  known: ReadonlyMap<string, BeadSummary>,
): { label: string; more: number } | null {
  const open = [...bead.blocked_by].sort(byId).flatMap((id) => {
    const blocker = known.get(id);
    if (blocker === undefined) return [id];
    return blocker.status === "closed" ? [] : [blockerLabel(blocker)];
  });
  const [label, ...rest] = open;
  return label === undefined ? null : { label, more: rest.length };
}

/** REQ-UI-065: the label of the first open blocker (by id) assigned to the person with `email`, or null. */
export function waitsOn(
  bead: Pick<BeadSummary, "blocked_by">,
  known: ReadonlyMap<string, BeadSummary>,
  email: string,
): string | null {
  for (const id of [...bead.blocked_by].sort(byId)) {
    const blocker = known.get(id);
    if (blocker !== undefined && blocker.status !== "closed" && samePerson(blocker.assignee, email)) return blockerLabel(blocker);
  }
  return null;
}
