import { FactList } from "@/components/FactList";
import { cn } from "@/lib/utils";
import type { BeadDetail } from "./api";
import { epicProgress, STATE_ORDER } from "./epicOverview";
import { STATE_LABEL, type GraphState } from "./graph";
import { OverviewCard } from "./OverviewCard";
import { progressOf } from "./progress";
import type { BeadsState } from "./useBeads";

const FILL: Record<GraphState, string> = {
  ready: "bg-state-ready",
  in_progress: "bg-state-progress",
  blocked: "bg-state-blocked",
  done: "bg-state-done",
  deferred: "bg-state-deferred",
};

/** REQ-UI-120: tracks closed, the bar split by state with its legend, then Points, Bugs and Prep. */
export function ProgressCard({ bead, beads }: { bead: BeadDetail; beads: BeadsState }) {
  if (beads.status !== "ok") {
    return (
      <OverviewCard title="Progress">
        <p className={beads.status === "error" ? "text-destructive" : "text-muted-foreground"}>
          {beads.status === "error" ? beads.message : "Loading progress…"}
        </p>
      </OverviewCard>
    );
  }
  const children = beads.beads.filter((b) => b.parent === bead.id);
  const { byState, points } = epicProgress(children);
  const { done: closed, total, prepDone, prepTotal } = progressOf(bead);
  const openBugs = bead.bugs.filter((b) => b.status !== "closed").length;
  const percent = total === 0 ? 0 : Math.round((100 * closed) / total);
  return (
    <OverviewCard title="Progress">
      <p className="m-0 text-sm">
        <span className="text-2xl font-bold">{closed}</span>
        {` of ${total} tracks closed · ${percent}%`}
      </p>
      <div className="flex h-2 w-full overflow-hidden rounded bg-muted" aria-hidden>
        {STATE_ORDER.filter((s) => byState[s] > 0).map((s) => (
          <div key={s} data-state={s} className={cn("h-full", FILL[s])} style={{ width: `${(100 * byState[s]) / total}%` }} />
        ))}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-muted-foreground">
        {STATE_ORDER.filter((s) => byState[s] > 0).map((s) => (
          <li key={s} className="flex items-center gap-1">
            <span aria-hidden className={cn("size-2 shrink-0 rounded-sm", FILL[s])} />
            {`${STATE_LABEL[s]} `}
            <b className="text-foreground">{byState[s]}</b>
          </li>
        ))}
      </ul>
      <FactList
        layout="inline"
        facts={[
          { label: "Points", value: points === null ? "No points" : `${points.done} of ${points.total} pt done` },
          { label: "Bugs", value: `${openBugs} open` },
          { label: "Prep", value: prepTotal === 0 ? "none" : `${prepDone}/${prepTotal}` },
        ]}
      />
    </OverviewCard>
  );
}
