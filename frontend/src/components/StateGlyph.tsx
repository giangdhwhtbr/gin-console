import type { ReactElement } from "react";

/** The five states a bead can be drawn in; the same union as `GraphState`. */
export type GlyphState = "ready" | "in_progress" | "blocked" | "done" | "deferred";

export const GLYPH_COLOR: Record<GlyphState, string> = {
  ready: "var(--state-ready)",
  in_progress: "var(--state-progress)",
  blocked: "var(--state-blocked)",
  done: "var(--state-done)",
  deferred: "var(--state-deferred)",
};

const STROKE = 1.8;

/** The drawing of a state around (cx, cy), to place in any svg (REQ-UI-064). */
export function glyphShape(state: GlyphState, cx: number, cy: number, r: number, color: string): ReactElement {
  return (
    <g data-shape={state}>
      {state === "ready" && <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={STROKE} />}
      {state === "in_progress" && (
        <>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={STROKE} />
          <path d={`M${cx} ${cy - r}a${r} ${r} 0 0 1 0 ${2 * r}z`} fill={color} />
        </>
      )}
      {state === "done" && <circle cx={cx} cy={cy} r={r + 0.9} fill={color} />}
      {state === "blocked" && (
        <>
          <circle cx={cx} cy={cy} r={r + 0.9} fill={color} />
          <path d={`M${cx - r * 0.55} ${cy}h${r * 1.1}`} stroke="var(--card)" strokeWidth={2} strokeLinecap="round" />
        </>
      )}
      {state === "deferred" && <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={STROKE} strokeDasharray="2.2 2.2" />}
    </g>
  );
}

/** A state as a glyph; the word that names it is drawn by the caller. */
export function StateGlyph({ state, size = 12, color, className }: { state: GlyphState; size?: number; color?: string; className?: string }) {
  const side = size + 4;
  const m = side / 2;
  return (
    <svg data-glyph={state} aria-hidden width={side} height={side} viewBox={`0 0 ${side} ${side}`} className={className}>
      {glyphShape(state, m, m, size / 2, color ?? GLYPH_COLOR[state])}
    </svg>
  );
}
