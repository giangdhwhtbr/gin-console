import { Minus, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GraphNodeButton } from "./GraphNode";
import { chainOf, edgeKey, edgePath, NODE, place, step, type Graph, type StepKey } from "./graph";

const KEYS: readonly StepKey[] = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"];
export const ZOOM = { min: 0.4, max: 2, step: 0.1 } as const;
const clamp = (scale: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, Math.round(scale * 100) / 100));

/** The scale that shows the whole graph in the canvas, never above 100%. */
export const fitScale = (width: number, height: number, boxW: number, boxH: number) =>
  clamp(Math.min(1, boxW / width, boxH / height));

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
  const box = useRef<HTMLDivElement>(null);
  const { at, width, height } = place(graph);
  const [scale, setScale] = useState(1);
  const fit = () => {
    const el = box.current;
    if (el !== null) setScale(fitScale(width, height, el.clientWidth, el.clientHeight));
  };
  // fitted once when the canvas opens; a refresh keeps the user's zoom
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(fit, []);
  useEffect(() => {
    const el = box.current;
    if (el === null) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setScale((s) => clamp(s + (event.deltaY < 0 ? ZOOM.step : -ZOOM.step)));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

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
      <div role="group" aria-label="Zoom" className="flex items-center gap-2">
        <Button size="sm" variant="outline" aria-label="Zoom out" onClick={() => setScale((s) => clamp(s - ZOOM.step))}>
          <Minus aria-hidden />
        </Button>
        <span className="w-12 text-center text-sm tabular-nums">{`${Math.round(scale * 100)}%`}</span>
        <Button size="sm" variant="outline" aria-label="Zoom in" onClick={() => setScale((s) => clamp(s + ZOOM.step))}>
          <Plus aria-hidden />
        </Button>
        <Button size="sm" variant="outline" onClick={fit}>
          Fit to view
        </Button>
      </div>
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
                const hot = chain?.edges.has(edgeKey(edge)) ?? false;
                const faded = chain !== null && !hot;
                return (
                  <g key={edgeKey(edge)} className={cn("transition-opacity motion-reduce:transition-none", hot && "text-foreground", faded && "opacity-30")}>
                    <path d={edgePath(from, to)} fill="none" stroke="currentColor" strokeWidth={hot ? 2 : 1} markerEnd="url(#graph-arrow)" />
                    {edge.links.length > 1 && (
                      <text
                        x={(from.x + to.x) / 2 + NODE.w / 2}
                        y={(from.y + NODE.h + to.y) / 2}
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
    </div>
  );
}
