import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/app/Link";
import { isUnknownProject, projectHref, rememberProject, resolveProject } from "@/app/project";
import { navigate, useLocation } from "@/app/route";
import { UnknownProject } from "@/app/UnknownProject";
import { usePageTitle } from "@/app/usePageTitle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchProjectBeads, type ProjectBeads } from "@/features/projects/api";
import { cn } from "@/lib/utils";
import { fetchMilestones, milestonePath, milestonesPath, type MilestoneEntry } from "./api";
import { CopyCommand } from "./CopyCommand";
import { ForecastCard } from "./ForecastCard";
import { percent, plural, shortDate } from "./format";
import { MilestoneError } from "./MilestoneError";
import { MilestoneStatus } from "./MilestoneStatus";
import { UnassignedEpics } from "./UnassignedEpics";
import { useLoad } from "./useLoad";

type Projects = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; names: string[] };

const ORDER = ["active", "scheduled", "planned", "closed"];
const rank = (status: string) => (ORDER.includes(status) ? ORDER.indexOf(status) : ORDER.length);
const COLUMNS = "@min-[60rem]:grid-cols-[8rem_minmax(0,1fr)_11rem_4rem_5.5rem_8.5rem_6rem]";

export function MilestonesPage() {
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const { search } = useLocation();
  const asked = new URLSearchParams(search).get("project") ?? "";

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
    if (asked !== selected && window.location.pathname === "/milestones") navigate(milestonesPath(selected), { replace: true });
  }, [selected, asked]);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Milestones</h1>
      {projects.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
      {projects.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription>{projects.message}</AlertDescription>
        </Alert>
      )}
      {projects.status === "ok" && names.length === 0 && <p className="text-muted-foreground">No projects configured.</p>}
      {unknown && <UnknownProject name={asked} names={names} hrefOf={(name) => projectHref("/milestones", name)} />}
      {selected !== "" && <MilestoneTable key={selected} project={selected} />}
    </section>
  );
}

// an entry without dates goes after the dated ones
const byStart = (a: MilestoneEntry, b: MilestoneEntry) =>
  a.start === null || b.start === null ? Number(a.start === null) - Number(b.start === null) : a.start.localeCompare(b.start);

function MilestoneTable({ project }: { project: string }) {
  const fetcher = useCallback(() => fetchMilestones(project), [project]);
  const { state, retry } = useLoad(fetcher, true);
  if (state.status === "loading") return <p className="text-muted-foreground">Loading milestones…</p>;
  if (state.status === "error") return <MilestoneError error={state.error} onRetry={retry} />;
  const { milestones, today, forecast, days_per_point } = state.data;
  const rows = [...milestones].sort((a, b) => rank(a.status) - rank(b.status) || byStart(a, b));
  return (
    <div className="@container flex min-w-0 flex-col gap-3">
      {state.error !== null && <p role="status" className="text-sm text-destructive">{`Refresh failed: ${state.error.message}`}</p>}
      <ForecastCard forecast={forecast} today={today} daysPerPoint={days_per_point} />
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
            <span>Lanes</span>
            <span>Say/do</span>
            <span>Epics</span>
            <span>Warnings</span>
          </li>
          {rows.map((m) => (
            <Row key={m.id} project={project} milestone={m} today={today} />
          ))}
        </ul>
      )}
      <UnassignedEpics project={project} />
    </div>
  );
}

function Row({ project, milestone: m, today }: { project: string; milestone: MilestoneEntry; today: string }) {
  const date = (iso: string) => shortDate(iso, today);
  const warnings = m.warnings ?? 0;
  const sayDo = m.velocity?.say_do ?? null;
  const share = m.epics.total === 0 ? 0 : (100 * m.epics.closed) / m.epics.total;
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
          <Link to={milestonePath(project, m.id)} className="underline-offset-2 hover:underline">
            {m.title}
          </Link>
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{m.id}</span>
      </span>
      <span className="flex flex-col text-sm">
        {m.kickoff !== null && <span>{`Kicks off ${date(m.kickoff)}`}</span>}
        <span className={cn(m.kickoff !== null && "text-muted-foreground")}>
          {m.start === null || m.end === null ? "No dates" : `${date(m.start)} – ${date(m.end)}`}
        </span>
        {m.finish !== null && (
          <span className={cn(m.end !== null && m.finish > m.end ? "text-state-blocked" : "text-muted-foreground")}>{`Finishes ${date(m.finish)}`}</span>
        )}
      </span>
      <span className="text-sm">{m.lanes === null ? "–" : plural(m.lanes, "lane")}</span>
      <span className="text-sm tabular-nums">{sayDo === null ? "–" : `Say/do ${percent(sayDo)}`}</span>
      {m.error !== null ? (
        <span className="col-span-2 text-sm text-destructive">{m.error}</span>
      ) : (
        <>
          <span className="flex items-center gap-2 text-sm tabular-nums">
            <span
              role="progressbar"
              aria-label={`Epics closed in ${m.title}`}
              aria-valuemin={0}
              aria-valuemax={m.epics.total}
              aria-valuenow={m.epics.closed}
              className="h-1.5 w-16 overflow-hidden rounded bg-muted"
            >
              <span className="block h-full bg-state-done" style={{ width: `${share}%` }} />
            </span>
            {`${m.epics.closed} of ${m.epics.total}`}
          </span>
          {warnings > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm text-state-blocked">
              <TriangleAlert aria-hidden className="size-3.5" />
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
