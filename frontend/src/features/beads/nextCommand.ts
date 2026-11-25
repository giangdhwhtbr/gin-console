import { personOf, samePerson } from "@/lib/people";
import type { BeadSummary } from "./api";
import { stateOf } from "./graph";
import { isMergeGate } from "./mergeGates";

const STAGES: readonly string[] = ["discuss", "plan", "orchestrate", "ship"];

/** REQ-BEADS-025: the command that continues a bead, or null; `stage` is the workflow stage of an epic, null while unknown. */
export function nextCommand(bead: BeadSummary, email: string, stage: string | null): string | null {
  const state = stateOf(bead);
  if (bead.issue_type === "milestone" || isMergeGate(bead) || state === "done" || state === "blocked" || state === "deferred") return null;
  if (bead.issue_type === "epic") {
    if (stage === null) return null;
    if (stage === "execute") return `/gin:execute ${bead.id}`;
    return STAGES.includes(stage) ? `/gin:${stage} ${bead.id}` : null;
  }
  if (state === "ready") return personOf(bead.assignee) === null || samePerson(bead.assignee, email) ? `gin task update ${bead.id} --claim` : null;
  return samePerson(bead.assignee, email) ? `/gin:execute ${bead.id}` : null;
}
