import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/app/Link";
import { projectHref } from "@/app/project";
import { usePageTitle } from "@/app/usePageTitle";
import { navigate, useLocation, useRestoreOnBack } from "@/app/route";
import { ProjectGuard } from "@/app/UnknownProject";
import { Legend } from "@/components/Legend";
import { Tabs } from "@/components/Tabs";
import { BeadsView } from "@/features/beads/BeadsView";
import { filtersToSearch, parseFilters } from "@/features/beads/filters";
import { rememberOrigin } from "@/app/origin";
import { formatDate, formatRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fetchMilestone, milestonePath, milestonesPath, type MilestoneDetail } from "./api";
import { awayLine, plural } from "./format";
import { dayOf, isoOf, zoomOf } from "./gantt";
import { GanttTab } from "./GanttTab";
import { MilestoneError } from "./MilestoneError";
import { MilestoneVelocity } from "./MilestoneVelocity";
import { MilestoneStatus } from "./MilestoneStatus";
import { parseRetros } from "./retro";
import { RetroTab } from "./RetroTab";
import { useMilestoneComments } from "./useMilestoneComments";
import { useLoad } from "./useLoad";

const TABS = [
  { value: "gantt", label: "Gantt" },
  { value: "beads", label: "Beads" },
  { value: "retro", label: "Retro" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function MilestonePage(props: { project: string; id: string }) {
  return (
    <ProjectGuard project={props.project} hrefOf={(name) => projectHref("/milestones", name)}>
      <Milestone {...props} />
    </ProjectGuard>
  );
}

function Milestone({ project, id }: { project: string; id: string }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const asked = params.get("start");
  const day = asked !== null && ISO.test(asked) ? dayOf(asked) : NaN; // month 13 gives NaN, Feb 31 rolls over
  const tabAsked = params.get("tab");
  const tab: Tab = tabAsked === "beads" || tabAsked === "graph" ? "beads" : tabAsked === "retro" ? "retro" : "gantt";
  const zoom = zoomOf(params.get("zoom"));
  const start = !Number.isNaN(day) && isoOf(day) === asked ? asked : null;
  // REQ-MILESTONE-UI-018: the old Graph tab is the Graph view of the Beads tab
  useEffect(() => {
    if (tabAsked === "graph") navigate(milestonePath(project, id, "beads", start, zoom, "?view=graph"), { replace: true });
  }, [tabAsked, project, id, start, zoom]);
  const current = useCallback(() => fetchMilestone(project, id, null), [project, id]);
  const preview = useCallback(
    () => (start === null ? Promise.resolve(null) : fetchMilestone(project, id, start)),
    [project, id, start],
  );
  const base = useLoad(current, true);
  // useLoad keeps the last answer while a new milestone loads: its title is not this one's
  const title = base.state.status === "ok" && !base.state.stale && base.state.data.id === id ? base.state.data.title : null;
  usePageTitle(title, project);
  // REQ-UI-072: the place the breadcrumb of a bead page returns to
  useEffect(() => {
    if (tabAsked !== "graph") rememberOrigin("milestone", `/milestones/${encodeURIComponent(project)}/${encodeURIComponent(id)}`, search, project, title);
  }, [tabAsked, project, id, search, title]);
  // the Beads tab restores itself once its beads have loaded
  useRestoreOnBack(base.state.status === "ok" && tab !== "beads");
  const shown = useLoad<MilestoneDetail | null>(preview, false);
  const comments = useMilestoneComments(project, id);
  // REQ-MILESTONE-UI-019: the tab counts the members with a retro; no number while loading or after an error
  const retros = comments.state === "ok" ? parseRetros(comments.comments, id).retros.length : 0;
  const tabs = TABS.map((t) => (t.value === "retro" && retros > 0 ? { ...t, label: `Retro ${retros}` } : t));
  const pick = (next: string | null) => navigate(milestonePath(project, id, tab, next, zoom), { replace: true });

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
          <Tabs tabs={tabs} tab={tab} onChange={(next) => navigate(milestonePath(project, id, next, start, zoom), { replace: true })} label="Milestone views" />
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "gantt" ? (
              <GanttTab
                project={project}
                plan={base.state.data}
                start={start}
                zoom={zoom}
                preview={shown.state}
                onRetryPreview={shown.retry}
                onStart={pick}
                onZoom={(next) => navigate(milestonePath(project, id, tab, start, next), { replace: true })}
              />
            ) : tab === "retro" ? (
              <RetroTab milestoneId={id} comments={comments} />
            ) : (
              <BeadsView
                project={project}
                fixedMilestone={id}
                filters={{ ...parseFilters(search), project, milestone: id }}
                onChange={(next) => navigate(milestonePath(project, id, "beads", start, zoom, filtersToSearch(next)), { replace: true })}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function MilestoneHeader({ plan }: { project: string; plan: MilestoneDetail }) {
  const [more, setMore] = useState(false);
  const date = (iso: string) => formatDate(iso, plan.today);
  const late = plan.overflow_days > 0;
  const away = awayLine(plan.away, plan.today);
  const outcome =
    plan.finish === null
      ? "No epics yet"
      : `Finishes ${date(plan.finish)}, ${late ? `${plural(plan.overflow_days, "working day")} past the end` : "on time"}`;
  return (
    <header className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">{plan.title}</h1>
        <span className="flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">{plan.id}</span>
          <Legend verdicts />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <MilestoneStatus status={plan.status} />
        <span>{formatRange(plan.start, plan.end, plan.today)}</span>
        {plan.kickoff !== null && <span>{`Kicks off ${date(plan.kickoff)}`}</span>}
        <span className={cn(late && "text-state-blocked")}>{outcome}</span>
        {plan.lanes !== null && <span>{plural(plan.lanes, "lane")}</span>}
        {plan.integration !== null && <span>{`Integration ${date(plan.integration)}`}</span>}
        {plan.deadline !== null && <span>{`Deadline ${date(plan.deadline)}`}</span>}
        {away !== null && <span>{away}</span>}
      </div>
      <MilestoneVelocity velocity={plan.velocity} />
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
