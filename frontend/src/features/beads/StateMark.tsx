import { Ban, Check, CircleCheck, CircleDot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { STATE_LABEL, stateOf, type GraphState } from "./graph";

const ICON = { ready: CircleCheck, in_progress: CircleDot, blocked: Ban, done: Check, deferred: Clock } as const;
const TEXT: Record<GraphState, string> = {
  ready: "text-state-ready",
  in_progress: "text-state-progress",
  blocked: "text-state-blocked",
  done: "text-state-done",
  deferred: "text-state-deferred",
};
const EDGE: Record<GraphState, string> = {
  ready: "border-l-state-ready",
  in_progress: "border-l-state-progress",
  blocked: "border-l-state-blocked",
  done: "border-l-state-done",
  deferred: "border-l-state-deferred",
};

/** The 4px left edge of a card or a node, in the colour of the state. */
export const stateEdge = (state: GraphState) => `border-l-4 ${EDGE[state]}`;

export function StateMark({ bead, className }: { bead: BeadSummary; className?: string }) {
  const state = stateOf(bead);
  const Icon = ICON[state];
  return (
    <span data-state={state} className={cn("inline-flex items-center gap-1 font-medium", TEXT[state], className)}>
      <Icon aria-hidden className="size-3.5" />
      {STATE_LABEL[state]}
    </span>
  );
}
