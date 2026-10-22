import { Ban, Check, CircleCheck, CircleDot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE, STATE_LABEL, stateOf, type GraphNode as Node, type GraphState, type Placed } from "./graph";

const ICON = { ready: CircleCheck, in_progress: CircleDot, blocked: Ban, done: Check, deferred: Clock } as const;
const TONE: Record<GraphState, string> = {
  ready: "border-l-state-ready text-state-ready",
  in_progress: "border-l-state-progress text-state-progress",
  blocked: "border-l-state-blocked text-state-blocked",
  done: "border-l-state-done text-state-done",
  deferred: "border-l-state-deferred text-state-deferred",
};

export function GraphNodeButton({
  node,
  at,
  selected,
  dimmed,
  tabStop,
  onSelect,
}: {
  node: Node;
  at: Placed;
  selected: boolean;
  dimmed: boolean;
  tabStop: boolean;
  onSelect: (id: string) => void;
}) {
  const state = stateOf(node.bead);
  const Icon = ICON[state];
  return (
    <button
      type="button"
      data-node={node.bead.id}
      data-external={node.external}
      data-dimmed={dimmed}
      aria-pressed={selected}
      tabIndex={tabStop ? 0 : -1}
      title={node.bead.title}
      onClick={() => onSelect(node.bead.id)}
      style={{ left: at.x, top: at.y, width: NODE.w, height: NODE.h }}
      className={cn(
        "absolute flex flex-col justify-center gap-0.5 rounded border border-l-4 bg-card px-2 text-left text-xs transition-opacity motion-reduce:transition-none",
        TONE[state],
        node.external && "border-dashed opacity-60",
        dimmed && "opacity-30",
        selected && "ring-2 ring-ring",
      )}
    >
      <span className="flex items-center justify-between font-mono text-muted-foreground">
        <span>{node.bead.id}</span>
        <span>{`P${node.bead.priority}`}</span>
      </span>
      <span className="truncate text-sm font-medium text-card-foreground">{node.bead.title}</span>
      <span className="flex items-center gap-1">
        <Icon aria-hidden className="size-3" />
        {STATE_LABEL[state]}
      </span>
    </button>
  );
}
