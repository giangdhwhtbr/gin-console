import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import { estimateText } from "@/features/beads/estimate";
import { DEFINITIONS } from "@/lib/definitions";
import { cn } from "@/lib/utils";

/** REQ-UI-110: "<p> pt" for a bead with points, else "<n>d" from its estimate; nothing when it has neither. */
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
  const text = suffix === undefined ? size : `${size} · ${suffix}`;
  return (
    <Hint text={`${text}. ${points === null ? DEFINITIONS.size : DEFINITIONS.points}`}>
      <Badge variant="outline" className={cn("min-w-0 shrink", className)}>
        <span className="truncate">{text}</span>
      </Badge>
    </Hint>
  );
}
