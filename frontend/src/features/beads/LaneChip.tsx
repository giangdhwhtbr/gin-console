import { Waypoints } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** REQ-UI-115: the lane of a track bead, in every view. */
export function LaneChip({ lane }: { lane: string }) {
  return (
    <Badge variant="outline" title={`Lane ${lane}`} className="min-w-0 shrink">
      <Waypoints aria-hidden className="size-3 shrink-0" />
      <span className="truncate">{lane}</span>
    </Badge>
  );
}
