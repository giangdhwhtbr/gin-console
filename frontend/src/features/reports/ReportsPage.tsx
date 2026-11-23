import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { rememberOrigin } from "@/app/origin";
import { isUnknownProject, projectHref, resolveProject } from "@/app/project";
import { navigate, useLocation, useRestoreOnBack } from "@/app/route";
import { UnknownProject } from "@/app/UnknownProject";
import { usePageTitle } from "@/app/usePageTitle";
import { Legend } from "@/components/Legend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs } from "@/components/Tabs";
import { Button } from "@/components/ui/button";
import { fetchMilestones, MilestonesError, type MilestoneList } from "@/features/milestones/api";
import { fetchProjectBeads, type ProjectBeads } from "@/features/projects/api";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fetchReport, type Report } from "./api";
import { PERIODS, TABS, parseReportSearch, reportSearch, type ReportFilters, type ReportTab } from "./filters";
import { DeliverySection } from "./DeliverySection";
import { Figures } from "./Figures";
import { figures, headlines, teamHeadline, velocityHeadline, type Headline } from "./headlines";
import { QualitySection } from "./QualitySection";
import { TeamSection } from "./team/TeamSection";
import { fetchTeam, selectedMilestone, type TeamReport } from "./teamApi";
import { clearSections, publishSections } from "./sectionStore";
import { TabStrip } from "./TabStrip";
import { VelocityTab } from "./velocity/VelocityTab";

type Projects =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; names: string[] };

type Settled = { status: "error"; message: string } | { status: "ok"; report: Report };
type Loaded = { status: "loading" } | Settled;
type SettledTeam = { status: "error"; message: string } | { status: "ok"; report: TeamReport };
type LoadedTeam = { status: "loading" } | SettledTeam;

const LABELS: Record<ReportTab, string> = { team: "Team", delivery: "Delivery", velocity: "Velocity", quality: "Quality" };
const hintOf = (h: Headline) => (
  <span className={cn("inline-flex items-center gap-1", h.warn && "text-state-blocked")}>
    {h.warn && <TriangleAlert aria-hidden className="size-3.5" />}
    {h.text}
  </span>
);

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function ReportsPage() {
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const [settled, setSettled] = useState<{ key: string; value: Settled } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [settledTeam, setSettledTeam] = useState<{ base: string; requested: string; value: SettledTeam } | null>(null);
  const [teamAttempt, setTeamAttempt] = useState(0);
  // the Milestones list of each project asked for (REQ-UI-095), or why the request failed
  const [lists, setLists] = useState<ReadonlyMap<string, MilestoneList | MilestonesError>>(new Map());
  const { search } = useLocation();
  const filters = parseReportSearch(search);

  useEffect(() => {
    void fetchProjectBeads().then(
      (list: ProjectBeads[]) => setProjects({ status: "ok", names: list.filter((p) => p.exists).map((p) => p.name) }),
      (error: unknown) => setProjects({ status: "error", message: messageOf(error) }),
    );
  }, []);

  const names = projects.status === "ok" ? projects.names : [];
  // REQ-UI-088: the project is the current one; an old link for all projects resolves like a link without a project
  const unknown = projects.status === "ok" && isUnknownProject(filters.project, names);
  const selected = projects.status === "ok" && !unknown ? resolveProject(filters.project, names) : "";
  const { days, sprint, tab } = filters;
  usePageTitle(`Reports · ${LABELS[tab]}`, selected);
  // REQ-UI-073: the place the breadcrumb of a bead page returns to
  useEffect(() => {
    if (selected !== "") rememberOrigin("reports", "/reports", reportSearch({ ...parseReportSearch(search), project: selected }), selected);
  }, [selected, search]);
  // the URL says which project is shown, when it was left out or was the retired `all`
  useEffect(() => {
    if (selected !== "" && selected !== filters.project && window.location.pathname === "/reports") {
      navigate(`/reports${reportSearch({ ...parseReportSearch(window.location.search), project: selected })}`, { replace: true });
    }
  }, [selected, filters.project]);
  // an answer counts only for the request it was made for, so a change of filters shows "loading" without a reset
  const key = JSON.stringify([selected, days, sprint, attempt]);
  const loaded: Loaded = settled !== null && settled.key === key ? settled.value : { status: "loading" };
  useRestoreOnBack(loaded.status === "ok");

  // an answer counts for the request it was made for; an answer to "server default" also counts for the milestone it chose,
  // so writing that milestone into the URL does not ask again
  const teamBase = JSON.stringify([selected, teamAttempt]);
  const { milestone, member } = filters;
  const teamCurrent =
    settledTeam !== null &&
    settledTeam.base === teamBase &&
    (settledTeam.requested === milestone ||
      (settledTeam.requested === "" && settledTeam.value.status === "ok" && settledTeam.value.report.milestone === milestone));
  const team: LoadedTeam = settledTeam !== null && teamCurrent ? settledTeam.value : { status: "loading" };

  useEffect(() => {
    if (selected === "" || teamCurrent) return;
    let live = true;
    fetchTeam(selected, milestone).then(
      (report) => {
        if (live) setSettledTeam({ base: teamBase, requested: milestone, value: { status: "ok", report } });
      },
      (error: unknown) => {
        if (live) setSettledTeam({ base: teamBase, requested: milestone, value: { status: "error", message: messageOf(error) } });
      },
    );
    return () => {
      live = false;
    };
  }, [selected, milestone, teamBase, teamCurrent]);

  // REQ-UI-095: the Milestones list of a single project is asked for once, whatever the tab; the page reloads it on Refresh
  const listed = lists.has(selected);
  useEffect(() => {
    if (selected === "" || listed) return;
    let live = true;
    const settle = (answer: MilestoneList | MilestonesError) => {
      if (live) setLists((prev) => new Map(prev).set(selected, answer));
    };
    fetchMilestones(selected).then(settle, (error: unknown) => settle(error instanceof MilestonesError ? error : new MilestonesError(messageOf(error))));
    return () => {
      live = false;
    };
  }, [selected, listed]);
  const answer = lists.get(selected);
  const list = answer === undefined || answer instanceof MilestonesError ? null : answer;
  // Retry forgets the failure; the effect above then asks again
  const retryList = () =>
    setLists((prev) => {
      const next = new Map(prev);
      next.delete(selected);
      return next;
    });

  // the URL follows the answer on the Team tab: the server's default milestone, and no member that is not in the milestone
  const teamReport = team.status === "ok" ? team.report : null;
  // the forecast of the selected milestone; none while the list loads or after it failed (REQ-MILESTONE-UI-023)
  const chosen = teamReport === null ? null : selectedMilestone(teamReport);
  const finish = list?.milestones.find((m) => m.id === chosen?.id)?.finish ?? null;
  useEffect(() => {
    if (tab !== "team" || teamReport === null) return;
    const next = { ...parseReportSearch(window.location.search), project: selected };
    if (teamReport.milestone !== null && teamReport.milestone !== milestone) {
      navigate(`/reports${reportSearch({ ...next, milestone: teamReport.milestone })}`, { replace: true });
    } else if (member !== "" && !teamReport.members.some((m) => m.member === member)) {
      navigate(`/reports${reportSearch({ ...next, member: "" })}`, { replace: true });
    }
  }, [tab, teamReport, selected, milestone, member]);

  useEffect(() => {
    if (selected === "") return;
    let live = true;
    fetchReport({ project: selected, days, sprint }).then(
      (report) => {
        if (live) setSettled({ key, value: { status: "ok", report } });
      },
      (error: unknown) => {
        if (live) setSettled({ key, value: { status: "error", message: messageOf(error) } });
      },
    );
    return () => {
      live = false;
    };
  }, [selected, days, sprint, key]);

  const headlineFor = (value: ReportTab): Headline | null => {
    if (value === "velocity") return list === null ? null : velocityHeadline(list.days_per_point);
    if (value === "team") return teamReport === null ? null : teamHeadline(teamReport, finish);
    return loaded.status === "ok" ? headlines(loaded.report)[value] : null;
  };
  const hintFor = (value: ReportTab) => {
    const h = headlineFor(value);
    return h === null ? undefined : hintOf(h);
  };
  // REQ-UI-129: the sidebar lists these sections while it is expanded; the store ignores a publish that changes nothing
  useEffect(() => {
    if (selected === "") return;
    publishSections(
      TABS.map((value) => {
        const h = headlineFor(value);
        return { tab: value, label: LABELS[value], headline: h?.text ?? "", warn: h?.warn ?? false, href: `/reports${reportSearch({ ...filters, project: selected, tab: value })}` };
      }),
      tab,
    );
  });
  useEffect(() => clearSections, []);
  const change = (next: ReportFilters) => navigate(`/reports${reportSearch(next)}`, { replace: true });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Reports</h1>
            <Legend />
          </div>
          {loaded.status === "ok" && (
            <p className="text-sm text-muted-foreground">
              Generated <time dateTime={loaded.report.generated_at}>{formatDateTime(loaded.report.generated_at)}</time>
            </p>
          )}
        </div>
      </div>
      {projects.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
      {projects.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription>{projects.message}</AlertDescription>
        </Alert>
      )}
      {projects.status === "ok" && names.length === 0 && <p className="text-muted-foreground">No projects configured.</p>}
      {unknown && <UnknownProject name={filters.project} names={names} hrefOf={(name) => projectHref("/reports", name)} />}
      {selected !== "" && (
        <>
          <div className="lg:group-data-[sidebar=expanded]/shell:hidden">
            <TabStrip>
              <Tabs
                label="Report"
                tab={tab}
                onChange={(next) => change({ ...filters, project: selected, tab: next })}
                tabs={TABS.map((value) => ({
                  value,
                  label: LABELS[value],
                  hint: hintFor(value),
                }))}
              />
            </TabStrip>
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col gap-6">
            {tab === "team" ? (
              <>
                {team.status === "loading" && <p className="text-muted-foreground">Loading team…</p>}
                {team.status === "error" && (
                  <Alert variant="destructive">
                    <AlertTitle>The team report could not be loaded</AlertTitle>
                    <AlertDescription>{team.message}</AlertDescription>
                    <Button type="button" size="sm" variant="outline" onClick={() => setTeamAttempt((n) => n + 1)}>
                      Retry
                    </Button>
                  </Alert>
                )}
                {teamReport !== null && <TeamSection project={selected} report={teamReport} filters={filters} finish={finish} onChange={change} />}
              </>
            ) : tab === "velocity" ? (
              answer === undefined ? (
                <p className="text-muted-foreground">Loading velocity…</p>
              ) : (
                <VelocityTab answer={answer} onRetry={retryList} />
              )
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1">
                    {PERIODS.map((period) => (
                      <Button
                        key={period}
                        type="button"
                        size="sm"
                        variant={period === days ? "default" : "outline"}
                        aria-pressed={period === days}
                        onClick={() => change({ ...filters, project: selected, days: period })}
                      >
                        {period} days
                      </Button>
                    ))}
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const value = new FormData(event.currentTarget).get("sprint");
                      change({ ...filters, project: selected, sprint: typeof value === "string" ? value.trim() : "" });
                    }}
                  >
                    <input
                      key={sprint}
                      name="sprint"
                      aria-label="Sprint"
                      placeholder="Sprint"
                      defaultValue={sprint}
                      className="rounded border bg-background px-2 py-1 text-sm"
                    />
                  </form>
                  <p className="text-sm text-muted-foreground">Beads closed in the last {days} days, or the epics of a sprint</p>
                </div>
                {loaded.status === "loading" && <p className="text-muted-foreground">Loading report…</p>}
                {loaded.status === "error" && (
                  <Alert variant="destructive">
                    <AlertTitle>The report could not be loaded</AlertTitle>
                    <AlertDescription>{loaded.message}</AlertDescription>
                    <Button type="button" size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                      Retry
                    </Button>
                  </Alert>
                )}
                {loaded.status === "ok" && (
                  <>
                    <Figures items={figures(tab, loaded.report)} />
                    {tab === "delivery" && <DeliverySection delivery={loaded.report.delivery} />}
                    {tab === "quality" && <QualitySection report={loaded.report} />}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
