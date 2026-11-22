import { Check } from "lucide-react";
import { useCallback, useState } from "react";
import type { EpicWorkflow } from "@/features/projects/api";
import { useLoad } from "@/features/milestones/useLoad";
import { cn } from "@/lib/utils";
import { fetchEpicWorkflow } from "./api";
import { Fact, Facts, OverviewCard } from "./OverviewCard";

const STAGES = ["discuss", "plan", "orchestrate", "execute", "ship"] as const;

/** A count whose items show on hover and on focus; "none" when there are no items. */
function Items({ label, items }: { label: string; items: readonly string[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return <>none</>;
  const id = `items-${label.toLowerCase()}`;
  return (
    <span className="relative inline-block max-w-full">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        className="cursor-help rounded underline decoration-dotted underline-offset-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
      >
        {items.length}
      </button>
      {open && (
        <ul id={id} role="tooltip" className="absolute top-full left-0 z-20 mt-1 flex w-max max-w-64 flex-col gap-1 rounded-md border bg-popover p-2 text-xs font-normal text-popover-foreground shadow-md">
          {items.map((item, i) => (
            <li key={`${i}:${item}`} className="wrap-anywhere">
              {item}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

function Stages({ workflow }: { workflow: EpicWorkflow }) {
  const at = STAGES.findIndex((s) => s === workflow.stage);
  const gates = Object.values(workflow.gates);
  return (
    <>
      {at < 0 && <p className="m-0 text-sm">{`Stage: ${workflow.stage}`}</p>}
      <ol aria-label="Stages" className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-xs">
        {STAGES.map((stage, i) => (
          <li
            key={stage}
            aria-current={i === at ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
              i === at ? "border-foreground bg-foreground font-bold text-background" : i < at ? "border-state-ready text-state-ready" : "text-muted-foreground",
            )}
          >
            {i < at && <Check aria-hidden className="size-3" />}
            {stage}
          </li>
        ))}
      </ol>
      <Facts>
        <Fact label="Gates">{gates.length === 0 ? "none" : `${gates.filter((g) => g === "satisfied").length} of ${gates.length} satisfied`}</Fact>
        <Fact label="Warnings">
          <Items label="Warnings" items={workflow.warnings} />
        </Fact>
        <Fact label="Waivers">
          <Items label="Waivers" items={workflow.review_waivers.map((w) => `${w.task_id}: ${w.reason} (${w.actor})`)} />
        </Fact>
      </Facts>
    </>
  );
}

/** REQ-UI-120: the stages of the epic with the current one marked, its gates, warnings and waivers; its own loading and error. */
export function WorkflowCard({ project, id }: { project: string; id: string }) {
  const fetcher = useCallback(() => fetchEpicWorkflow(project, id), [project, id]);
  const { state, retry } = useLoad(fetcher, false);
  return (
    <OverviewCard title="Workflow">
      {state.status === "loading" && <p className="text-muted-foreground">Loading workflow…</p>}
      {state.status === "error" && (
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-destructive">
          <span className="min-w-0 wrap-anywhere">{state.error.message}</span>
          <button type="button" className="hover:text-identity" onClick={retry}>
            Retry
          </button>
        </p>
      )}
      {state.status === "ok" && (state.data.stage === "" ? <p className="text-muted-foreground">No workflow</p> : <Stages workflow={state.data} />)}
    </OverviewCard>
  );
}
