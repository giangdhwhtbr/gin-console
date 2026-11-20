import { Check, Clock } from "lucide-react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { progressOf, type GraphNode, type StepKey } from "./graph";
import { GraphNodeButton } from "./GraphNode";
import { LaneBox } from "./LaneBox";
import { LANE_CHIP, laneGraphChain, laneGraphLines, laneGraphStep, type LaneGraph } from "./laneGraph";
import { useZoom } from "./useZoom";
import { ZoomBar } from "./ZoomBar";

const KEYS: readonly StepKey[] = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"];

/** REQ-UI-117: lane boxes in tiers, the cards in them, the arrows between, and the merge gates as chips on the arrows. */
export function LaneGraphCanvas({
  graph,
  beads,
  selected,
  tabStop,
  onSelect,
  onOpen,
  onEscape,
}: {
  graph: LaneGraph;
  /** Every loaded bead, for the child counts of the cards. */
  beads: readonly BeadSummary[];
  selected: string;
  tabStop: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onEscape: () => void;
}) {
  const { box, scale, fit, zoomIn, zoomOut } = useZoom(graph.width, graph.height);
  const progress = progressOf(beads);
  const parents = new Set(beads.flatMap((b) => (b.parent === null ? [] : [b.parent])));
  const chain = graph.cards.some((c) => c.bead.id === selected) ? laneGraphChain(graph, selected) : null;
  const nodeOf = (bead: BeadSummary, layer: number, stack: number): GraphNode => ({
    bead,
    external: false,
    layer,
    order: stack,
    done: progress.get(bead.id)?.done ?? 0,
    total: progress.get(bead.id)?.total ?? 0,
    hasKids: parents.has(bead.id),
    group: "layer",
  });
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return onEscape();
    const key = KEYS.find((k) => k === event.key);
    const from = event.target instanceof HTMLElement ? event.target.dataset.node : undefined;
    if (key === undefined || from === undefined) return;
    const next = laneGraphStep(graph, from, key);
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
        className="isolate h-[calc(100dvh-14rem)] min-h-80 overflow-auto overscroll-contain rounded border"
      >
        <div style={{ width: graph.width * scale, height: graph.height * scale }}>
          <div className="relative origin-top-left" style={{ width: graph.width, height: graph.height, transform: `scale(${scale})` }}>
            {graph.boxes.map((b) => (
              <LaneBox key={b.lane ?? ""} box={b} />
            ))}
            <svg aria-hidden width={graph.width} height={graph.height} className="absolute inset-0 text-muted-foreground">
              <defs>
                <marker id="lane-graph-arrow" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
                </marker>
              </defs>
              {graph.arrows.map((a) => {
                const hot = chain?.arrows.has(`${a.from}>${a.to}`) ?? false;
                return (
                  <path
                    key={`${a.from}>${a.to}>${a.gate?.id ?? ""}`}
                    data-arrow={`${a.from}>${a.to}`}
                    d={a.d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={hot ? 2 : 1}
                    strokeDasharray={a.dashed ? "4 3" : undefined}
                    markerEnd="url(#lane-graph-arrow)"
                    className={cn("transition-opacity motion-reduce:transition-none", hot && "text-foreground", chain !== null && !hot && "opacity-30")}
                  />
                );
              })}
            </svg>
            {graph.cards.map((c) => (
              <GraphNodeButton
                key={c.bead.id}
                node={nodeOf(c.bead, c.layer, c.stack)}
                at={c}
                selected={c.bead.id === selected}
                dimmed={chain !== null && !chain.nodes.has(c.bead.id)}
                tabStop={c.bead.id === tabStop}
                showLane={false}
                onSelect={onSelect}
                onOpen={onOpen}
              />
            ))}
            {graph.chips.map((chip) => {
              const Icon = chip.kind === "merged" ? Check : Clock;
              return (
                <span
                  key={`${chip.gate.id}>${chip.box ?? ""}>${chip.x}`}
                  data-chip={chip.gate.id}
                  data-kind={chip.kind}
                  title={chip.words}
                  className={cn(
                    "absolute flex items-center gap-1 rounded-full border bg-card px-2 text-xs text-foreground",
                    chip.kind === "merged" ? "border-state-ready" : "border-state-blocked",
                  )}
                  style={{ left: chip.x, top: chip.y, width: chip.w, height: LANE_CHIP.h }}
                >
                  <Icon aria-hidden className={cn("size-3 shrink-0", chip.kind === "merged" ? "text-state-ready" : "text-state-blocked")} />
                  <span className="min-w-0 truncate">{chip.words}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <ul aria-label="Lanes" className="sr-only">
        {laneGraphLines(graph).map((line) => (
          <li key={line.key}>{line.text}</li>
        ))}
      </ul>
    </div>
  );
}
