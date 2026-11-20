import { type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { GraphNodeButton } from "./GraphNode";
import { chainOf, edgeKey, edgePath, linkLabels, NODE, place, step, type Graph, type StepKey } from "./graph";
import { useZoom } from "./useZoom";
import { ZoomBar } from "./ZoomBar";

export { fitScale, ZOOM } from "./useZoom";

const KEYS: readonly StepKey[] = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"];

export function GraphCanvas({
  graph,
  selected,
  tabStop,
  onSelect,
  onOpen,
  onEscape,
}: {
  graph: Graph;
  selected: string;
  tabStop: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onEscape: () => void;
}) {
  const { at, width, height } = place(graph);
  const { box, scale, fit, zoomIn, zoomOut } = useZoom(width, height);

  const labels = linkLabels(graph, at);
  const group = graph.nodes.filter((n) => n.group === "unlinked");
  const groupTop = group.length === 0 ? null : (at.get(group[0].bead.id)?.y ?? 0) - NODE.head;
  const chain = at.has(selected) ? chainOf(graph, selected) : null;
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return onEscape();
    const key = KEYS.find((k) => k === event.key);
    const from = event.target instanceof HTMLElement ? event.target.dataset.node : undefined;
    if (key === undefined || from === undefined) return;
    const next = step(graph, from, key);
    if (next === null) return;
    event.preventDefault();
    Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-node]"))
      .find((el) => el.dataset.node === next)
      ?.focus();
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ZoomBar scale={scale} onOut={zoomOut} onIn={zoomIn} onFit={fit} />
      <div
        ref={box}
        data-testid="graph-canvas"
        onKeyDown={onKeyDown}
        className="h-[calc(100dvh-14rem)] min-h-80 overflow-auto overscroll-contain rounded border"
      >
        <div style={{ width: width * scale, height: height * scale }}>
          <div className="relative origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>
            <svg aria-hidden width={width} height={height} className="absolute inset-0 text-muted-foreground">
              <defs>
                <marker id="graph-arrow" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
                </marker>
              </defs>
              {graph.edges.map((edge) => {
                const from = at.get(edge.from);
                const to = at.get(edge.to);
                if (from === undefined || to === undefined) return null;
                const label = labels.get(edgeKey(edge));
                const hot = chain?.edges.has(edgeKey(edge)) ?? false;
                const faded = chain !== null && !hot;
                return (
                  <g key={edgeKey(edge)} className={cn("transition-opacity motion-reduce:transition-none", hot && "text-foreground", faded && "opacity-30")}>
                    <path d={edgePath(from, to)} fill="none" stroke="currentColor" strokeWidth={hot ? 2 : 1} markerEnd="url(#graph-arrow)" />
                    {label !== undefined && (
                      <text
                        x={label.x}
                        y={label.y}
                        textAnchor="middle"
                        className="fill-current text-[10px]"
                      >
                        {`${edge.links.length} links`}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {groupTop !== null && (
              <p
                className="absolute m-0 text-xs text-muted-foreground"
                style={{ left: NODE.pad, top: groupTop, height: NODE.head }}
              >{`${group.length} without dependencies`}</p>
            )}
            {graph.nodes.map((node) => {
              const position = at.get(node.bead.id);
              return position === undefined ? null : (
                <GraphNodeButton
                  key={node.bead.id}
                  node={node}
                  at={position}
                  selected={node.bead.id === selected}
                  dimmed={chain !== null && !chain.nodes.has(node.bead.id)}
                  tabStop={node.bead.id === tabStop}
                  onSelect={onSelect}
                  onOpen={onOpen}
                />
              );
            })}
          </div>
        </div>
      </div>
      {graph.edges.length > 0 && (
        <ul aria-label="Dependencies" className="sr-only">
          {graph.edges.map((edge) => (
            <li key={edgeKey(edge)}>
              <span>{`${edge.to} is blocked by ${edge.from}`}</span>
              {edge.links.some((l) => edgeKey(l) !== edgeKey(edge)) && (
                <ul>
                  {edge.links.map((l) => (
                    <li key={edgeKey(l)}>{`${l.to} is blocked by ${l.from}`}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
