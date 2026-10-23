import { cn } from "@/lib/utils";
import { NODE, stateOf, type GraphNode as Node, type Placed } from "./graph";
import { StateMark, stateEdge } from "./StateMark";

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
        "absolute flex flex-col justify-center gap-0.5 rounded border bg-card px-2 text-left text-xs transition-opacity motion-reduce:transition-none",
        stateEdge(state),
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
      <StateMark bead={node.bead} className="text-xs" />
    </button>
  );
}
