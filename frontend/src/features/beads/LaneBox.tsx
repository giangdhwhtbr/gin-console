import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { GraphState } from "./graph";
import { LANE_GRAPH, type LaneBoxLayout } from "./laneGraph";
import type { LaneStateKind } from "./lanes";
import { StateWord } from "./StateMark";

const STATE_OF: Record<LaneStateKind, GraphState> = {
  closed: "done",
  running: "in_progress",
  waiting: "blocked",
  blocked: "blocked",
  not_started: "ready",
  idle: "ready",
};

type BoxStyle = CSSProperties & Record<"--box", string>;

/** REQ-UI-118: one lane box, tinted by its lane colour, with a two-line header; "No lane" is a dashed neutral box. */
export function LaneBox({ box }: { box: LaneBoxLayout }) {
  const name = box.lane ?? "No lane";
  const style: BoxStyle = { left: box.x, top: box.y, width: box.w, height: box.h, "--box": `var(--lane-${box.slot})` };
  return (
    <section
      aria-label={`Lane ${name}`}
      data-lane={box.lane ?? ""}
      style={style}
      className={cn(
        "absolute overflow-hidden rounded-lg border",
        box.lane === null
          ? "border-2 border-dashed border-muted-foreground bg-muted/40"
          : "border-[color-mix(in_srgb,var(--box)_55%,transparent)] bg-[color-mix(in_srgb,var(--box)_9%,var(--card))] dark:border-[color-mix(in_srgb,var(--box)_60%,transparent)] dark:bg-[color-mix(in_srgb,var(--box)_16%,var(--card))]",
      )}
    >
      <header className="flex flex-col gap-1 px-3.5 pt-3" style={{ height: LANE_GRAPH.head }}>
        <div className="flex min-w-0 items-center gap-2">
          {box.lane !== null && <span aria-hidden data-swatch className="size-2.5 shrink-0 rounded-[3px] bg-(--box)" />}
          <h3 className="min-w-0 truncate text-sm font-bold" title={name}>
            {name}
          </h3>
          {box.state !== null && <StateWord state={STATE_OF[box.state.kind]} words={box.state.words} className="shrink-0 text-xs" />}
        </div>
        <p className="m-0 max-w-full truncate text-xs text-muted-foreground" title={box.meta}>
          {box.meta}
        </p>
      </header>
    </section>
  );
}
