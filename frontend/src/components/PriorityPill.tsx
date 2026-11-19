import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** REQ-UI-110: `P<n>`; P0 in the destructive colour, P1 in the warning colour (the amber of `state-blocked`), the rest neutral. */
export function PriorityPill({ priority, className }: { priority: number; className?: string }) {
  return (
    <Badge
      variant={priority === 0 ? "destructive" : "secondary"}
      className={cn(priority === 1 && "bg-state-blocked/10 text-state-blocked", className)}
    >{`P${priority}`}</Badge>
  );
}
