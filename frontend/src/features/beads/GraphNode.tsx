import { GitMerge, Layers } from "lucide-react";
import { Strand } from "@/components/Strand";
import { shortId } from "@/lib/shortId";
import { cn } from "@/lib/utils";
import { LaneChip } from "./LaneChip";
import { gateState, gateWords } from "./mergeGates";
import { PrepChip } from "./PrepChip";
import { isPrep } from "./prep";
import { NODE, type GraphNode as Node, type Placed } from "./graph";
import { StateMark } from "./StateMark";

export function GraphNodeButton({
  node,
  at,
  selected,
  dimmed,
  tabStop,
  onSelect,
  onOpen,
  showLane = true,
}: {
  node: Node;
  at: Placed;
  selected: boolean;
  dimmed: boolean;
  tabStop: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  showLane?: boolean;
}) {
  const short = shortId(node.bead.id);
  const gate = node.bead.waits_for ?? null;
  const words = gate === null ? node.bead.title : `Waits for ${gateWords(gate)} to merge`;
  return (
    <button
      type="button"
      data-node={node.bead.id}
      data-id={node.bead.id}
      data-external={node.external}
      data-dimmed={dimmed}
      aria-pressed={selected}
      tabIndex={tabStop ? 0 : -1}
      title={words}
      onClick={() => onSelect(node.bead.id)}
      onDoubleClick={() => onOpen(node.bead.id)}
      style={{ left: at.x, top: at.y, width: NODE.w, height: NODE.h }}
      className={cn(
        "absolute flex flex-col justify-center overflow-hidden gap-0.5 rounded border bg-card px-2 text-left text-xs transition-opacity motion-reduce:transition-none",
        (node.external || gate !== null) && "border-dashed",
        node.external && "opacity-60",
        dimmed && "opacity-30",
        selected && "ring-2 ring-ring",
      )}
    >
      <span className="flex items-center justify-between gap-1 font-mono text-muted-foreground">
        <span className="min-w-0 truncate" title={node.bead.id} aria-hidden={short !== node.bead.id || undefined}>
          {short}
        </span>
        {short !== node.bead.id && <span className="sr-only">{node.bead.id}</span>}
        <span className="shrink-0">{`P${node.bead.priority}`}</span>
      </span>
      <span className="flex min-w-0 items-center gap-1 text-sm font-medium text-card-foreground">
        {gate !== null && <GitMerge aria-hidden className="size-3.5 shrink-0" />}
        <span className="truncate">{words}</span>
      </span>
      <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
        <span className="flex min-w-0">
          {gate === null ? (
            <StateMark bead={node.bead} className="text-xs" />
          ) : (
            <span className="min-w-0 truncate text-xs font-medium" title={gateState(node.bead.status)}>
              {gateState(node.bead.status)}
            </span>
          )}
        </span>
        {isPrep(node.bead.labels) && <PrepChip />}
        {showLane && node.bead.lane !== null && <LaneChip lane={node.bead.lane} />}
        {node.hasKids && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-muted-foreground">
            <Layers aria-hidden className="size-3.5" />
            {/* node 184px: 8 padding each side, icon 14 + gap 4 + gap 8 + count ~30 leave ~72px for the drawing and ~32px for the state label */}
            <Strand counts={node.counts} noun="tracks" maxWidth={72} />
          </span>
        )}
      </span>
    </button>
  );
}
