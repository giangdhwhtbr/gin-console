import { Hint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { personOf } from "@/lib/people";

/** The person of a bead's assignee with the full assignee as tooltip, or a muted "Unassigned" (REQ-UI-135). */
export function AssigneeName({ assignee, className }: { assignee: string | null; className?: string }) {
  const person = personOf(assignee);
  if (person === null || assignee === null) return <span className={cn("text-muted-foreground", className)}>Unassigned</span>;
  return (
    <Hint text={assignee}>
      <span className={className}>{person}</span>
    </Hint>
  );
}
