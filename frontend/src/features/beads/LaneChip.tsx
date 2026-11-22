import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS } from "@/lib/definitions";

const LANE_DOT = [
  "bg-[var(--lane-1)]",
  "bg-[var(--lane-2)]",
  "bg-[var(--lane-3)]",
  "bg-[var(--lane-4)]",
  "bg-[var(--lane-5)]",
  "bg-[var(--lane-6)]",
  "bg-[var(--lane-7)]",
  "bg-[var(--lane-8)]",
] as const;

/** REQ-UI-115, REQ-UI-140: a dot and the lane name; the dot has the lane colour for a `slot` of 1..8, else the muted colour. */
export function LaneChip({ lane, slot }: { lane: string; slot?: number }) {
  const dot = slot === undefined ? undefined : LANE_DOT[slot - 1];
  return (
    <Hint text={`Lane ${lane}. ${DEFINITIONS.lane}`}>
      <span className="inline-flex min-w-0 shrink items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${dot ?? "bg-muted-foreground"}`} />
        <span className="truncate">{lane}</span>
      </span>
    </Hint>
  );
}
