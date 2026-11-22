import { cn } from "@/lib/utils";

/** REQ-UI-110, REQ-UI-140: `P<n>` as text, bold in the text colour for P0 and P1, muted otherwise. */
export function PriorityPill({ priority, className }: { priority: number; className?: string }) {
  return (
    <span
      data-priority={priority}
      className={cn("text-xs", priority <= 1 ? "font-semibold text-foreground" : "text-muted-foreground", className)}
    >{`P${priority}`}</span>
  );
}
