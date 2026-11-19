import { Badge } from "@/components/ui/badge";
import { estimateText } from "@/features/beads/estimate";
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
    <Badge variant="outline" title={text} className={cn("min-w-0 shrink", className)}>
      <span className="truncate">{text}</span>
    </Badge>
  );
}
