import { Waypoints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS } from "@/lib/definitions";

/** REQ-UI-115: the lane of a track bead, in every view. */
export function LaneChip({ lane }: { lane: string }) {
  return (
    <Hint text={`Lane ${lane}. ${DEFINITIONS.lane}`}>
      <Badge variant="outline" className="min-w-0 shrink">
        <Waypoints aria-hidden className="size-3 shrink-0" />
        <span className="truncate">{lane}</span>
      </Badge>
    </Hint>
  );
}
