import { StateGlyph } from "@/components/StateGlyph";
import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { MilestoneStatus } from "@/features/milestones/MilestoneStatus";
import type { BeadSummary } from "./api";
import { STATE_LABEL, stateOf, type GraphState } from "./graph";
import { useMilestoneStatus } from "./milestoneStatus";

const TEXT: Record<GraphState, string> = {
  ready: "text-state-ready",
  in_progress: "text-state-progress",
  blocked: "text-state-blocked",
  done: "text-state-done",
  deferred: "text-state-deferred",
};
const DEFINITION: Record<GraphState, string> = {
  ready: DEFINITIONS.ready,
  in_progress: DEFINITIONS.inProgress,
  blocked: DEFINITIONS.blocked,
  done: DEFINITIONS.done,
  deferred: DEFINITIONS.deferred,
};
/** The state of a bead; a milestone bead draws its milestone status when it is known (REQ-MILESTONE-UI-022). */
export function StateMark({ bead, className }: { bead: BeadSummary; className?: string }) {
  const milestone = useMilestoneStatus(bead.id);
  if (bead.issue_type === "milestone" && milestone !== null) return <MilestoneStatus status={milestone} className={className} />;
  const state = stateOf(bead);
  return (
    <Hint text={DEFINITION[state]}>
      <span data-state={state} className={cn("inline-flex min-w-0 items-center gap-1 font-medium", TEXT[state], className)}>
        <StateGlyph state={state} />
        <span className="truncate">{STATE_LABEL[state]}</span>
      </span>
    </Hint>
  );
}

/** The glyph of a state in its colour with the given words (REQ-UI-112 lane states). */
export function StateWord({ state, words, className }: { state: GraphState; words: string; className?: string }) {
  return (
    <Hint text={words === STATE_LABEL[state] ? DEFINITION[state] : `${words}. ${DEFINITION[state]}`}>
      <span data-state={state} className={cn("inline-flex max-w-full min-w-0 items-center gap-1 font-medium", TEXT[state], className)}>
        <StateGlyph state={state} className="shrink-0" />
        <span className="truncate">{words}</span>
      </span>
    </Hint>
  );
}
