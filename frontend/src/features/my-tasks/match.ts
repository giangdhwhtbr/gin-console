import type { BeadSummary } from "@/features/beads/api";

/** Mine when the assignee is the email or its part before @, ignoring case and surrounding spaces; owner is the creator and never counts. */
export function isMine(bead: Pick<BeadSummary, "assignee">, email: string): boolean {
  const assignee = (bead.assignee ?? "").trim().toLowerCase();
  if (assignee === "") return false;
  const mine = email.trim().toLowerCase();
  return assignee === mine || assignee === mine.slice(0, mine.indexOf("@"));
}
