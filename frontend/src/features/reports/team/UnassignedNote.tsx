import type { Unassigned } from "../teamApi";

/** REQ-REPORTS-036: note shown above the member table when at least 20% of closed beads lack an assignee. */
export function UnassignedNote({ unassigned }: { unassigned: Unassigned }) {
  if (unassigned.total === 0 || unassigned.closed * 5 < unassigned.total) return null;
  return (
    <p role="note" className="text-sm text-muted-foreground">
      {unassigned.closed} of {unassigned.total} closed beads have no assignee, so member numbers undercount.
    </p>
  );
}
