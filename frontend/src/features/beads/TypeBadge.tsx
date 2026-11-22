import { cn } from "@/lib/utils";

/** REQ-UI-067: on rows, cards and nodes only a bug shows its type, as a carnelian word; the bead page lists the type among its facts. */
export function TypeBadge({ type, className }: { type: string; className?: string }) {
  if (type !== "bug") return null;
  return (
    <span data-type="bug" className={cn("text-xs font-medium text-type-bug", className)}>
      bug
    </span>
  );
}
