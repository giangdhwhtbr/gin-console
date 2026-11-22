import { Hint } from "@/components/ui/tooltip";
import { estimateText } from "@/features/beads/estimate";
import { DEFINITIONS } from "@/lib/definitions";
import { cn } from "@/lib/utils";

/** REQ-UI-110, REQ-UI-140: "<p> pt" for a bead with points, else "<n>d" from its estimate, as muted text; nothing when it has neither. */
export function SizeBadge({
  points,
  estimateMinutes = null,
  suffix,
  className,
}: {
  points: number | null;
  estimateMinutes?: number | null;
  suffix?: string;
  className?: string;
}) {
  const size = points === null ? estimateText(estimateMinutes) : `${points} pt`;
  if (size === null) return null;
  const text = suffix === undefined ? size : `${size}, ${suffix}`;
  return (
    <Hint text={`${text}. ${points === null ? DEFINITIONS.size : DEFINITIONS.points}`}>
      <span className={cn("min-w-0 shrink truncate text-xs text-muted-foreground", className)}>{text}</span>
    </Hint>
  );
}
