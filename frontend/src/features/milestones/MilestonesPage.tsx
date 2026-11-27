import { useCallback, useEffect, useState } from "react";
import { Link } from "@/app/Link";
import { isUnknownProject, projectHref, rememberProject, resolveProject } from "@/app/project";
import { navigate, useLocation, useRestoreOnBack } from "@/app/route";
import { UnknownProject } from "@/app/UnknownProject";
import { usePageTitle } from "@/app/usePageTitle";
import { StateGlyph } from "@/components/StateGlyph";
import { Strand, toStrandCounts } from "@/components/Strand";
import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS, type DefinitionKey } from "@/lib/definitions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchProjectBeads, type ProjectBeads } from "@/features/projects/api";
import { formatDate, formatRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fetchMilestones, milestonePath, type DaysPerPoint, type Forecast, type MilestoneEntry } from "./api";
import { CopyCommand } from "./CopyCommand";
import { ExportWbsMenu } from "./ExportWbsMenu";
import { ForecastCard } from "./ForecastCard";
import { percent, plural } from "./format";
import { lateOf } from "./late";
import { MilestoneError } from "./MilestoneError";
import { MilestoneStatus } from "./MilestoneStatus";
import { ProjectFinish } from "./ProjectFinish";
import { ProjectTimeline } from "./timeline/ProjectTimeline";
import { zoomOf, type Zoom } from "./timeline/axis";
import { UnassignedEpics } from "./UnassignedEpics";
import { useLoad } from "./useLoad";

type Projects = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; names: string[] };

const ORDER = ["active", "scheduled", "planned", "closed"];
const rank = (status: string) => (ORDER.includes(status) ? ORDER.indexOf(status) : ORDER.length);
const COLUMNS = "@min-[60rem]:grid-cols-[8rem_minmax(0,1fr)_11rem_4rem_5.5rem_8.5rem_6rem]";

type View = "timeline" | "list";
const VIEWS: { view: View; label: string }[] = [
  { view: "timeline", label: "Timeline" },
  { view: "list", label: "List" },
];

/** The URL of the page with `changes` applied to the current query; a `null` value removes the key. */
function pathWith(search: string, changes: Record<string, string | null>): string {
  const query = new URLSearchParams(search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) query.delete(key);
    else query.set(key, value);
  }
  return `/milestones?${query.toString()}`;
}

export function MilestonesPage() {
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const asked = params.get("project") ?? "";
  // REQ-MILESTONE-UI-033: the Timeline unless the URL says view=list
  const view: View = params.get("view") === "list" ? "list" : "timeline";
  const showClosed = params.get("closed") === "1";
  const zoom = zoomOf(params.get("zoom"));

  useEffect(() => {
    void fetchProjectBeads().then(
      (list: ProjectBeads[]) => setProjects({ status: "ok", names: list.filter((p) => p.exists).map((p) => p.name) }),
      (error: unknown) => setProjects({ status: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, []);

  const names = projects.status === "ok" ? projects.names : [];
  const unknown = projects.status === "ok" && isUnknownProject(asked, names);
  const selected = projects.status === "ok" && !unknown ? resolveProject(asked, names) : "";

  usePageTitle("Milestones", selected);

  // REQ-UI-124: the project shown is the current one, and the URL says which it is
  useEffect(() => {
    if (selected === "") return;
    rememberProject(selected);
    if (asked !== selected && window.location.pathname === "/milestones") navigate(pathWith(search, { project: selected }), { replace: true });
  }, [selected, asked, search]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Milestones</h1>
        {selected !== "" && (
          <div className="flex items-center gap-3">
            <nav aria-label="View" className="flex gap-1 text-sm">
              {VIEWS.map((v) => (
                <Link
                  key={v.view}
                  to={pathWith(search, { view: v.view === "list" ? "list" : null })}
                  aria-current={v.view === view ? "page" : undefined}
                  className={cn("rounded px-2 py-1 hover:bg-muted", v.view === view && "bg-secondary font-medium")}
                >
                  {v.label}
                </Link>
              ))}
            </nav>
            <ExportWbsMenu project={selected} />
          </div>
        )}
      </div>
      {projects.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
      {projects.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription>{projects.message}</AlertDescription>
        </Alert>
      )}
      {projects.status === "ok" && names.length === 0 && <p className="text-muted-foreground">No projects configured.</p>}
      {unknown && <UnknownProject name={asked} names={names} hrefOf={(name) => projectHref("/milestones", name)} />}
      {selected !== "" && <MilestoneTable key={selected} project={selected} view={view} zoom={zoom} showClosed={showClosed} search={search} />}
    </section>
  );
}

// an entry without dates goes after the dated ones
const byStart = (a: MilestoneEntry, b: MilestoneEntry) =>
  a.start === null || b.start === null ? Number(a.start === null) - Number(b.start === null) : a.start.localeCompare(b.start);

type TableProps = { project: string; view: View; zoom: Zoom; showClosed: boolean; search: string };

function MilestoneTable({ project, view, zoom, showClosed, search }: TableProps) {
  const fetcher = useCallback(() => fetchMilestones(project), [project]);
  const { state, retry } = useLoad(fetcher, true);
  useRestoreOnBack(state.status === "ok");
  if (state.status === "loading") return <p className="text-muted-foreground">Loading milestones…</p>;
  if (state.status === "error") return <MilestoneError error={state.error} onRetry={retry} />;
  const { milestones, today, forecast, days_per_point } = state.data;
  const rows = [...milestones].sort((a, b) => rank(a.status) - rank(b.status) || byStart(a, b));
  return (
    <div className="@container flex min-w-0 flex-col gap-3">
      {state.error !== null && <p role="status" className="text-sm text-destructive">{`Refresh failed: ${state.error.message}`}</p>}
      <ProjectFinish forecast={forecast} today={today} />
      {view === "timeline" ? (
        <ProjectTimeline
          project={project}
          list={state.data}
          zoom={zoom}
          showClosed={showClosed}
          onZoom={(next) => navigate(pathWith(search, { zoom: next === "months" ? null : next }))}
          onShowClosed={(on) => navigate(pathWith(search, { closed: on ? "1" : null }))}
        />
      ) : (
        <ListView project={project} rows={rows} today={today} forecast={forecast} daysPerPoint={days_per_point} />
      )}
    </div>
  );
}

function ListView({ project, rows, today, forecast, daysPerPoint }: { project: string; rows: MilestoneEntry[]; today: string; forecast: Forecast | null; daysPerPoint: DaysPerPoint | null }) {
  return (
    <>
      <ForecastCard forecast={forecast} today={today} daysPerPoint={daysPerPoint} />
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p>{`No milestones in ${project} yet. Create one with:`}</p>
          <CopyCommand command={'gin milestone create "<title>" --start <date> --end <date>'} />
        </div>
      ) : (
        <ul aria-label="Milestones" className="flex flex-col divide-y rounded border bg-card">
          <li aria-hidden className={cn("hidden gap-3 px-3 py-2 text-sm text-muted-foreground @min-[60rem]:grid", COLUMNS)}>
            <span>Status</span>
            <span>Milestone</span>
            <span>Period</span>
            <Header label="Parallel lanes" rule="parallelLanes" />
            <Header label="Commitment met" rule="commitmentMet" />
            <span>Epics</span>
            <span>Warnings</span>
          </li>
          {rows.map((m) => (
            <Row key={m.id} project={project} milestone={m} today={today} />
          ))}
        </ul>
      )}
      <UnassignedEpics project={project} />
    </>
  );
}

function Header({ label, rule }: { label: string; rule: DefinitionKey }) {
  return (
    <Hint text={DEFINITIONS[rule]}>
      <span>{label}</span>
    </Hint>
  );
}

function Row({ project, milestone: m, today }: { project: string; milestone: MilestoneEntry; today: string }) {
  const date = (iso: string) => formatDate(iso, today);
  const warnings = m.warnings ?? 0;
  const sayDo = m.velocity?.say_do ?? null;
  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2",
        COLUMNS,
        m.status === "closed" && "text-muted-foreground",
      )}
    >
      <MilestoneStatus status={m.status} />
      <span className="flex min-w-0 items-baseline gap-2">
        <span title={m.title} className="min-w-0 truncate font-medium">
          <Link to={milestonePath(project, m.id)} className="hover:text-identity">
            {m.title}
          </Link>
        </span>
        <span className="shrink-0 font-mono text-13 text-muted-foreground">{m.id}</span>
      </span>
      <span className="flex flex-col text-sm">
        {m.kickoff !== null && <span>{`Kicks off ${date(m.kickoff)}`}</span>}
        <span className={cn(m.kickoff !== null && "text-muted-foreground")}>
          {m.start === null || m.end === null ? "No dates" : formatRange(m.start, m.end, today)}
        </span>
        {m.finish !== null && (
          <span className={cn(lateOf({ status: m.status, end: m.end, finish: m.finish }, today) ? "text-state-blocked" : "text-muted-foreground")}>{`Finishes ${date(m.finish)}`}</span>
        )}
      </span>
      <span className="text-sm">{m.lanes === null ? "–" : plural(m.lanes, "lane")}</span>
      <span className="text-sm tabular-nums">{sayDo === null ? "–" : `Commitment met ${percent(sayDo)}`}</span>
      {m.error !== null ? (
        <span className="col-span-2 text-sm text-destructive">{m.error}</span>
      ) : (
        <>
          <span className="flex items-center text-sm">
            <Strand counts={toStrandCounts(m.epics)} noun="epics" />
          </span>
          {warnings > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm text-state-blocked">
              <StateGlyph state="deferred" color="var(--state-blocked)" size={10} />
              {plural(warnings, "warning")}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}
        </>
      )}
    </li>
  );
}
