import type { CSSProperties } from "react";
import { Strand } from "@/components/Strand";
import { cn } from "@/lib/utils";
import { LANE_GRAPH, type LaneBoxLayout } from "./laneGraph";
import { GRAPH_STATE_OF } from "./lanes";
import { StateWord } from "./StateMark";

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
          {box.state !== null && <StateWord state={GRAPH_STATE_OF[box.state.kind]} words={box.state.words} className="shrink-0 text-xs" />}
        </div>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {box.meta !== "" && (
            <p className="m-0 min-w-0 truncate" title={box.meta}>
              {box.meta}
            </p>
          )}
          {/* box ~184px inside: 96px of drawing + gap 8 + count ~30 leave ~50px for the holder and lease, which truncate */}
          <Strand counts={box.tracks.counts} noun="tracks" maxWidth={96} className="shrink-0" />
        </div>
      </header>
    </section>
  );
}
