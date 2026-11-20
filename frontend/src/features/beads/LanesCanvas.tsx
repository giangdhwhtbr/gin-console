import { Check, Clock } from "lucide-react";
import type { KeyboardEvent } from "react";
import { FactList, type Fact } from "@/components/FactList";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { progressOf, type GraphNode, type GraphState } from "./graph";
import { GraphNodeButton } from "./GraphNode";
import { LANE, laneStep, laneSummary, MARKER, type LaneBoard, type LaneKey, type LaneRow, type LaneStateKind } from "./lanes";
import { StateWord } from "./StateMark";
import { useLaneHeaderWidth } from "./useLaneHeaderWidth";

const KEYS: readonly LaneKey[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
const STATE_OF: Record<LaneStateKind, GraphState> = {
  closed: "done",
  running: "in_progress",
  waiting: "blocked",
  blocked: "blocked",
  not_started: "ready",
  idle: "ready",
};

function factsOf(row: LaneRow): Fact[] {
  const tracks = { label: "Tracks", value: `${row.tracks.closed}/${row.tracks.total} closed` };
  if (row.state === null) return [tracks];
  const facts: Fact[] = [{ label: "State", value: <StateWord state={STATE_OF[row.state.kind]} words={row.state.words} /> , title: row.state.words }];
  if (row.state.kind !== "closed") {
    facts.push({ label: "Held by", value: row.holders.length > 0 ? row.holders.join(", ") : "Unclaimed" });
    if (row.lease !== null) facts.push({ label: "Lease", value: row.lease.text });
  }
  return [...facts, tracks];
}

/** REQ-UI-111..114: sticky lane headers, cards on shared columns, orthogonal arrows in the gaps, and the merge markers above them. */
export function LanesCanvas({
  board,
  beads,
  selected,
  tabStop,
  onSelect,
  onOpen,
  onEscape,
}: {
  board: LaneBoard;
  /** Every loaded bead, for the child counts of the cards. */
  beads: readonly BeadSummary[];
  selected: string;
  tabStop: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onEscape: () => void;
}) {
  const headerW = useLaneHeaderWidth();
  const progress = progressOf(beads);
  const parents = new Set(beads.flatMap((b) => (b.parent === null ? [] : [b.parent])));
  const nodeOf = (bead: BeadSummary, row: number, column: number): GraphNode => ({
    bead,
    external: false,
    layer: row,
    order: column,
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
    const next = laneStep(board, from, key);
    if (next === null) return;
    event.preventDefault();
    onSelect(next);
    Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-node]"))
      .find((el) => el.dataset.node === next)
      ?.focus();
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        data-testid="lanes-canvas"
        onKeyDown={onKeyDown}
        className="h-[calc(100dvh-14rem)] min-h-80 overflow-auto overscroll-contain rounded border"
      >
        <div className="flex" style={{ width: headerW + board.width, height: board.height }}>
          <div className="sticky left-0 z-10 shrink-0 border-r bg-card" style={{ width: headerW, height: board.height }}>
            {board.rows.map((row) => (
              <section
                key={row.lane ?? ""}
                aria-label={`Lane ${row.lane ?? "No lane"}`}
                className="absolute flex flex-col gap-1 overflow-hidden px-3 py-2"
                style={{ top: row.top, height: LANE.rowH, width: headerW }}
              >
                <h3 className="truncate text-sm font-semibold" title={row.lane ?? "No lane"}>
                  {row.lane ?? "No lane"}
                </h3>
                <FactList facts={factsOf(row)} layout="inline" />
              </section>
            ))}
          </div>
          <div className="relative shrink-0" style={{ width: board.width, height: board.height }}>
            {board.rows.map((row) => (
              <div key={row.lane ?? ""} aria-hidden className="absolute inset-x-0 bg-muted/40" style={{ top: row.top, height: LANE.rowH }} />
            ))}
            <svg aria-hidden width={board.width} height={board.height} className="absolute inset-0 text-muted-foreground">
              <defs>
                <marker id="lanes-arrow" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
                </marker>
              </defs>
              {board.arrows.map((arrow) => (
                <polyline
                  key={`${arrow.from}>${arrow.to}>${arrow.gate?.id ?? ""}`}
                  points={arrow.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  markerEnd="url(#lanes-arrow)"
                />
              ))}
            </svg>
            {board.markers.map((m) => {
              const Icon = m.gate.status === "closed" ? Check : Clock;
              return (
                <span
                  key={`${m.gate.id}>${m.to}`}
                  data-marker={m.gate.id}
                  title={m.words}
                  className="absolute flex items-center gap-1 rounded border bg-card px-1.5 text-xs text-foreground"
                  style={{ left: m.x, top: m.y, width: m.w, height: MARKER.h }}
                >
                  <Icon aria-hidden className={cn("size-3 shrink-0", m.gate.status === "closed" ? "text-state-done" : "text-state-blocked")} />
                  <span className="truncate">{m.words}</span>
                </span>
              );
            })}
            {board.rows.flatMap((row) =>
              row.cards.map((c) => (
                <GraphNodeButton
                  key={c.bead.id}
                  node={nodeOf(c.bead, c.row, c.column)}
                  at={c}
                  selected={c.bead.id === selected}
                  dimmed={false}
                  tabStop={c.bead.id === tabStop}
                  showLane={false}
                  onSelect={onSelect}
                  onOpen={onOpen}
                />
              )),
            )}
          </div>
        </div>
      </div>
      <ul aria-label="Lanes" className="sr-only">
        {laneSummary(board).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
