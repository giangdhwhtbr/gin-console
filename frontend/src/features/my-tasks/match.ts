import type { BeadSummary } from "@/features/beads/api";
import { samePerson } from "@/lib/people";

/** Mine when the assignee is the same person as the email (REQ-BEADS-023); owner is the creator and never counts. */
export function isMine(bead: Pick<BeadSummary, "assignee">, email: string): boolean {
  return samePerson(bead.assignee, email);
}
