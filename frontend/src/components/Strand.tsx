import type { ReactElement } from "react";
import { DEFINITIONS } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { GLYPH_COLOR, glyphShape, type GlyphState } from "./StateGlyph";
import { Hint } from "./ui/tooltip";

export type StrandCounts = { done: number; inProgress: number; blocked: number; ready: number; deferred: number };
type StrandNoun = "tracks" | "epics" | "beads";

/** The order of the beads of a strand (REQ-UI-138). */
export const STRAND_ORDER = ["done", "inProgress", "blocked", "ready", "deferred"] as const;
const GLYPH_OF: Record<(typeof STRAND_ORDER)[number], GlyphState> = {
  done: "done",
  inProgress: "in_progress",
  blocked: "blocked",
  ready: "ready",
  deferred: "deferred",
};
const WORD_OF: Record<(typeof STRAND_ORDER)[number], string> = {
  done: "done",
  inProgress: "in progress",
  blocked: "blocked",
  ready: "ready",
  deferred: "deferred",
};
/** Above this many items the strand draws one segment per state. */
const MAX_BEADS = 16;

const atLeastZero = (n: number | undefined): number => Math.max(n ?? 0, 0);

/** The strand counts of a `child_counts`; a missing Ready is what is left of the total. */
export function toStrandCounts(c: { total: number; closed: number; in_progress?: number; blocked?: number; ready?: number; deferred?: number }): StrandCounts {
  const done = atLeastZero(c.closed);
  const inProgress = atLeastZero(c.in_progress);
  const blocked = atLeastZero(c.blocked);
  const deferred = atLeastZero(c.deferred);
  const ready = c.ready === undefined ? atLeastZero(c.total - done - inProgress - blocked - deferred) : atLeastZero(c.ready);
  return { done, inProgress, blocked, ready, deferred };
}

export const strandTotal = (c: StrandCounts): number => c.done + c.inProgress + c.blocked + c.ready + c.deferred;

/** "2 done, 1 in progress, 1 blocked, 3 ready", without the states counted 0. */
export function strandWords(c: StrandCounts): string {
  const parts = STRAND_ORDER.filter((s) => c[s] > 0).map((s) => `${c[s]} ${WORD_OF[s]}`);
  return parts.length === 0 ? "0 done" : parts.join(", ");
}

export const strandSentence = (c: StrandCounts, noun: StrandNoun): string => `${strandWords(c)} of ${strandTotal(c)} ${noun}`;

const SIZE = { sm: { r: 4.5, gap: 3.5, wide: 120 }, lg: { r: 9, gap: 7, wide: 240 } };

/**
 * REQ-UI-138: a thread carrying one bead per item, or one segment per state above 16 items or when the beads would
 * be wider than `maxWidth` (px of the drawing, not of the count), followed by the count.
 */
export function Strand({
  counts,
  noun,
  size = "sm",
  maxWidth,
  className,
}: {
  counts: StrandCounts;
  noun: StrandNoun;
  size?: "sm" | "lg";
  maxWidth?: number;
  className?: string;
}): ReactElement | null {
  const total = strandTotal(counts);
  if (total === 0) return null;
  const { r, gap, wide } = SIZE[size];
  const height = 2 * r + 4;
  const y = height / 2;
  const sentence = strandSentence(counts, noun);
  const present = STRAND_ORDER.filter((s) => counts[s] > 0);

  let drawing: ReactElement;
  let width: number;
  const step = 2 * r + gap;
  if (total <= MAX_BEADS && (maxWidth === undefined || total * step + 6 <= maxWidth)) {
    width = total * step + 6;
    const beads = STRAND_ORDER.flatMap((s) => Array.from({ length: counts[s] }, (_, i) => ({ s, i })));
    drawing = (
      <>
        <path d={`M1 ${y}H${width - 1}`} stroke="var(--border)" strokeWidth={1.5} fill="none" />
        {beads.map(({ s, i }, at) => (
          <g key={`${s}-${i}`} data-bead>
            {glyphShape(GLYPH_OF[s], 3 + r + at * step, y, r, GLYPH_COLOR[GLYPH_OF[s]])}
          </g>
        ))}
      </>
    );
  } else {
    // up to 16 items the beads did not fit `maxWidth`, which then is the width of the thread
    width = total <= MAX_BEADS ? (maxWidth ?? wide) : Math.min(wide, maxWidth ?? wide);
    // every present state keeps at least 1px, taken out of the room the others share
    const room = width - 2 * (present.length - 1) - present.length;
    const h = r * 1.6;
    const widths = present.map((s) => 1 + (room * counts[s]) / total);
    drawing = (
      <>
        {present.map((s, i) => {
          const w = widths[i];
          const at = widths.slice(0, i).reduce((sum, each) => sum + each + 2, 0);
          const color = GLYPH_COLOR[GLYPH_OF[s]];
          const filled = s === "done" || s === "inProgress" || s === "blocked";
          return (
            <rect
              key={s}
              data-segment={s}
              x={filled ? at : at + 0.75}
              y={filled ? y - h / 2 : y - h / 2 + 0.75}
              width={filled ? w : Math.max(w - 1.5, 1)}
              height={filled ? h : h - 1.5}
              rx={h / 2}
              fill={filled ? color : "var(--card)"}
              stroke={filled ? "none" : color}
              strokeWidth={1.5}
              strokeDasharray={s === "deferred" ? "3 2.5" : undefined}
            />
          );
        })}
      </>
    );
  }

  return (
    <Hint text={`${sentence}. ${DEFINITIONS.progress}`}>
      <span role="img" aria-label={sentence} data-strand={`${counts.done}/${total}`} className={cn("inline-flex items-center gap-2", size === "lg" && "flex-wrap", className)}>
        <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
          {drawing}
        </svg>
        {size === "sm" ? (
          <span className="tabular-nums text-xs text-muted-foreground">{`${counts.done}/${total}`}</span>
        ) : (
          <span className="text-sm">
            {present.map((s, i) => (
              <span key={s}>
                {i > 0 && ", "}
                {s === "done" ? <b>{`${counts[s]} ${WORD_OF[s]}`}</b> : `${counts[s]} ${WORD_OF[s]}`}
              </span>
            ))}
          </span>
        )}
      </span>
    </Hint>
  );
}
