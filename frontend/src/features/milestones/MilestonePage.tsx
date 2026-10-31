import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "@/app/Link";
import { navigate, useLocation } from "@/app/route";
import { cn } from "@/lib/utils";
import { fetchMilestone, milestonePath, milestonesPath, type MilestoneDetail } from "./api";
import { plural, shortDate } from "./format";
import { GanttTab } from "./GanttTab";
import { MilestoneError } from "./MilestoneError";
import { MilestoneStatus } from "./MilestoneStatus";
import { useLoad } from "./useLoad";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function MilestonePage({ project, id }: { project: string; id: string }) {
  const { search } = useLocation();
  const asked = new URLSearchParams(search).get("start");
  const start = asked !== null && ISO.test(asked) ? asked : null;
  const current = useCallback(() => fetchMilestone(project, id, null), [project, id]);
  const preview = useCallback(
    () => (start === null ? Promise.resolve(null) : fetchMilestone(project, id, start)),
    [project, id, start],
  );
  const base = useLoad(current, true);
  const shown = useLoad<MilestoneDetail | null>(preview, false);
  const pick = (next: string | null) => navigate(milestonePath(project, id, "gantt", next), { replace: true });

  return (
    <section className="flex flex-col gap-4">
      <Link to={milestonesPath(project)} className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
        <ArrowLeft aria-hidden className="size-4" />
        {`Milestones in ${project}`}
      </Link>
      {base.state.status === "loading" && <p className="text-muted-foreground">Loading milestone…</p>}
      {base.state.status === "error" && <MilestoneError error={base.state.error} onRetry={base.retry} />}
      {base.state.status === "ok" && (
        <>
          <MilestoneHeader project={project} plan={base.state.data} />
          {base.state.error !== null && (
            <p role="status" className="text-sm text-destructive">{`Refresh failed: ${base.state.error.message}`}</p>
          )}
          <GanttTab
            project={project}
            plan={base.state.data}
            start={start}
            preview={shown.state}
            onRetryPreview={shown.retry}
            onStart={pick}
          />
        </>
      )}
    </section>
  );
}

export function MilestoneHeader({ plan }: { project: string; plan: MilestoneDetail }) {
  const [more, setMore] = useState(false);
  const date = (iso: string) => shortDate(iso, plan.today);
  const late = plan.overflow_days > 0;
  const outcome =
    plan.finish === null
      ? "No epics yet"
      : `Finishes ${date(plan.finish)}, ${late ? `${plural(plan.overflow_days, "working day")} past the end` : "on time"}`;
  return (
    <header className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">{plan.title}</h1>
        <span className="font-mono text-sm text-muted-foreground">{plan.id}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <MilestoneStatus status={plan.status} />
        <span>{`${date(plan.start)} – ${date(plan.end)}`}</span>
        {plan.kickoff !== null && <span>{`Kicks off ${date(plan.kickoff)}`}</span>}
        <span className={cn(late && "text-state-blocked")}>{outcome}</span>
      </div>
      {plan.description !== "" && (
        <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
          <p className={cn(!more && "line-clamp-2")}>{plan.description}</p>
          <button type="button" onClick={() => setMore(!more)} className="underline underline-offset-2">
            {more ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </header>
  );
}
