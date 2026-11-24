import { useEffect, useState, type ReactNode } from "react";
import { rememberOrigin } from "@/app/origin";
import { isUnknownProject, resolveProject } from "@/app/project";
import { navigate, useLocation, useRestoreOnBack } from "@/app/route";
import { UnknownProject } from "@/app/UnknownProject";
import { usePageTitle } from "@/app/usePageTitle";
import { Legend } from "@/components/Legend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchMilestones, MilestonesError, type MilestoneList } from "@/features/milestones/api";
import { fetchProjectBeads, type ProjectBeads } from "@/features/projects/api";
import { formatDateTime } from "@/lib/dates";
import { fetchReport, ReportRequestError, type Report } from "./api";
import { parseReportSearch, reportSearch, type Period, type ReportFilters, type Scope } from "./filters";
import { DeliverySection } from "./DeliverySection";
import { Figures } from "./Figures";
import { figures, headlines, teamHeadline, velocityHeadline, type Headline } from "./headlines";
import { ReworkSection } from "./ReworkSection";
import { ScopeSelect } from "./ScopeSelect";
import { SectionLinks } from "./SectionLinks";
import { SECTION_LABELS, SECTIONS, sectionPath, type ReportSection } from "./sections";
import { TeamSection } from "./team/TeamSection";
import { fetchTeam, selectedMilestone, type TeamMilestone, type TeamReport } from "./teamApi";
import { clearSections, publishSections, type SectionLink } from "./sectionStore";
import { TabStrip } from "./TabStrip";
import { VelocityTab } from "./velocity/VelocityTab";

type Projects =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; names: string[] };

type Settled = { status: "error"; message: string } | { status: "ok"; report: Report };
type Loaded = { status: "loading" } | Settled;
/** `refused`: the server answered 422, the scope in the URL is not one it takes. */
type SettledTeam = { status: "error"; message: string; refused: boolean } | { status: "ok"; report: TeamReport };
type LoadedTeam = { status: "loading" } | SettledTeam;
type TeamAnswer = { base: string; requested: Scope; value: SettledTeam };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

// the scope from its two URL values, so that effects depend on plain values
const scopeOf = (id: string | null, days: Period | null): Scope =>
  id !== null ? { kind: "milestone", id } : days !== null ? { kind: "period", days } : { kind: "default" };
const sameScope = (a: Scope, b: Scope) =>
  a.kind === "milestone" ? b.kind === "milestone" && a.id === b.id : a.kind === "period" ? b.kind === "period" && a.days === b.days : b.kind === "default";

/**
 * An answer counts only for the request it was made for. An answer to the default scope, or to a milestone the server
 * does not list, also counts for the milestone it chose, so writing that milestone into the URL does not ask again.
 */
function answers(answer: TeamAnswer, base: string, scope: Scope): boolean {
  if (answer.base !== base) return false;
  if (sameScope(answer.requested, scope)) return true;
  return scope.kind === "milestone" && answer.requested.kind !== "period" && answer.value.status === "ok" && answer.value.report.milestone === scope.id;
}

/** The Reports page for one section: the scope of REQ-REPORTS-033, the row of section links and the section's panel. */
export function ReportsView({ section }: { section: ReportSection }) {
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const [settled, setSettled] = useState<{ key: string; value: Settled } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [settledTeam, setSettledTeam] = useState<TeamAnswer | null>(null);
  const [teamAttempt, setTeamAttempt] = useState(0);
  // the milestones of the last team report of a project, which the scope select lists while the next one loads
  const [known, setKnown] = useState<{ project: string; milestones: TeamMilestone[] } | null>(null);
  // the Milestones list of each project asked for (REQ-UI-095), or why the request failed
  const [lists, setLists] = useState<ReadonlyMap<string, MilestoneList | MilestonesError>>(new Map());
  const { pathname, search } = useLocation();
  const filters = parseReportSearch(search);
  const { scope } = filters;
  const scopeId = scope.kind === "milestone" ? scope.id : null;
  const scopeDays = scope.kind === "period" ? scope.days : null;

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
  usePageTitle(`Reports · ${SECTION_LABELS[section]}`, selected);
  // REQ-UI-073: the place the breadcrumb of a bead page returns to
  useEffect(() => {
    if (selected !== "") rememberOrigin("reports", pathname, reportSearch({ ...parseReportSearch(search), project: selected }), selected);
  }, [selected, pathname, search]);
  // an answer counts only for the request it was made for, so a change of scope shows "loading" without a reset
  const key = JSON.stringify([selected, scopeId, scopeDays, attempt]);
  const loaded: Loaded = settled !== null && settled.key === key ? settled.value : { status: "loading" };
  useRestoreOnBack(loaded.status === "ok");

  const teamBase = JSON.stringify([selected, teamAttempt]);
  const teamCurrent = settledTeam !== null && answers(settledTeam, teamBase, scope);
  const team: LoadedTeam = settledTeam !== null && teamCurrent ? settledTeam.value : { status: "loading" };

  // REQ-REPORTS-033: the team report is asked for whatever the section; its milestones fill the scope select
  useEffect(() => {
    if (selected === "" || teamCurrent) return;
    let live = true;
    const requested = scopeOf(scopeId, scopeDays);
    fetchTeam(selected, requested).then(
      (report) => {
        if (!live) return;
        setSettledTeam({ base: teamBase, requested, value: { status: "ok", report } });
        setKnown({ project: selected, milestones: report.milestones });
      },
      (error: unknown) => {
        const refused = error instanceof ReportRequestError && error.status === 422;
        if (live) setSettledTeam({ base: teamBase, requested, value: { status: "error", message: messageOf(error), refused } });
      },
    );
    return () => {
      live = false;
    };
  }, [selected, scopeId, scopeDays, teamBase, teamCurrent]);
  const milestones = known !== null && known.project === selected ? known.milestones : null;

  // REQ-UI-095: the Milestones list of a single project is asked for once, whatever the section; the page reloads it on Refresh
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

  const teamReport = team.status === "ok" ? team.report : null;
  // the forecast of the selected milestone; none while the list loads or after it failed (REQ-MILESTONE-UI-023)
  const chosen = teamReport === null ? null : selectedMilestone(teamReport);
  const finish = list?.milestones.find((m) => m.id === chosen?.id)?.finish ?? null;

  // the URL names the project and the scope (REQ-UI-088, REQ-REPORTS-033): the current project for a missing or retired one,
  // the team report's milestone, or 30 days without milestones, and on the Team section no member outside the scope;
  // a milestone the server refuses gives way to the default scope
  let fixed: ReportFilters = { ...filters, project: selected };
  if (team.status === "error" && team.refused && scope.kind === "milestone") fixed = { ...fixed, scope: { kind: "default" } };
  if (teamReport !== null) {
    if (scope.kind === "default" || (scope.kind === "milestone" && teamReport.milestone !== scope.id)) {
      fixed = { ...fixed, scope: teamReport.milestone !== null ? { kind: "milestone", id: teamReport.milestone } : { kind: "period", days: 30 } };
    }
    if (section === "team" && fixed.member !== "" && !teamReport.members.some((m) => m.member === fixed.member)) fixed = { ...fixed, member: "" };
  }
  const fix = selected !== "" && reportSearch(fixed) !== reportSearch(filters) ? sectionPath(section, reportSearch(fixed)) : null;
  useEffect(() => {
    if (fix !== null) navigate(fix, { replace: true });
  }, [fix]);

  // Delivery and Rework ask for the report of the scope once the URL names one, and a milestone once the team report has it
  const confirmed = scopeDays !== null || (scopeId !== null && teamReport?.milestone === scopeId);
  useEffect(() => {
    const requested = scopeOf(scopeId, scopeDays);
    if (selected === "" || requested.kind === "default" || !confirmed) return;
    let live = true;
    fetchReport(selected, requested).then(
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
  }, [selected, scopeId, scopeDays, key, confirmed]);

  const headlineFor = (value: ReportSection): Headline | null => {
    switch (value) {
      case "status":
        return null; // the verdict of the status report (REQ-REPORTS-027) comes with the Status section
      case "team":
        return teamReport === null ? null : teamHeadline(teamReport, finish);
      case "velocity":
        return list === null ? null : velocityHeadline(list.days_per_point);
      case "delivery":
      case "rework":
        return loaded.status === "ok" ? headlines(loaded.report)[value] : null;
    }
  };
  // changing the section keeps the project, the scope, the member and the status (REQ-UI-095)
  const links: SectionLink[] = SECTIONS.map((value) => {
    const h = headlineFor(value);
    return { section: value, label: SECTION_LABELS[value], headline: h?.text ?? "", warn: h?.warn ?? false, href: sectionPath(value, reportSearch({ ...filters, project: selected })) };
  });
  // REQ-UI-129: the sidebar lists these sections while it is expanded; the store ignores a publish that changes nothing
  useEffect(() => {
    if (selected !== "") publishSections(links, section);
  });
  useEffect(() => clearSections, []);
  const change = (next: ReportFilters) => navigate(sectionPath(section, reportSearch(next)), { replace: true });
  // a new scope is a new place in the history, and its member and bead status start over (REQ-REPORTS-033)
  const pick = (next: Exclude<Scope, { kind: "default" }>) => navigate(sectionPath(section, reportSearch({ project: selected, scope: next, member: "", status: "" })));

  // REQ-REPORTS-033, REQ-UI-093: every section needs the team report for its scope select, so its failure shows in the select's place
  const teamError = team.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>The team report could not be loaded</AlertTitle>
          <AlertDescription>{team.message}</AlertDescription>
          <Button type="button" size="sm" variant="outline" onClick={() => setTeamAttempt((n) => n + 1)}>
            Retry
          </Button>
        </Alert>
  );
  const reportBody = (body: (report: Report) => ReactNode) =>
    !confirmed ? (
      team.status === "loading" && <p className="text-muted-foreground">Loading report…</p>
    ) : (
      <>
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
        {loaded.status === "ok" && body(loaded.report)}
      </>
    );

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
      {unknown && <UnknownProject name={filters.project} names={names} hrefOf={(name) => sectionPath(section, `?${new URLSearchParams({ project: name }).toString()}`)} />}
      {selected !== "" && (
        <>
          <div className="lg:group-data-[sidebar=expanded]/shell:hidden">
            <TabStrip>
              <SectionLinks links={links} current={section} />
            </TabStrip>
          </div>
          <section aria-label={SECTION_LABELS[section]} className="flex min-w-0 flex-col gap-6">
            {teamError || (milestones !== null && <ScopeSelect milestones={milestones} scope={scope} onChange={pick} />)}
            {section === "status" ? (
              <h2 className="font-semibold">Status</h2>
            ) : section === "team" ? (
              <>
                {team.status === "loading" && <p className="text-muted-foreground">Loading team…</p>}
                {teamReport !== null && <TeamSection project={selected} report={teamReport} filters={filters} finish={finish} onChange={change} />}
              </>
            ) : section === "velocity" ? (
              answer === undefined ? (
                <p className="text-muted-foreground">Loading velocity…</p>
              ) : (
                <VelocityTab answer={answer} onRetry={retryList} selected={scopeId} />
              )
            ) : section === "delivery" ? (
              reportBody((report) => (
                <>
                  <Figures items={figures(section, report)} />
                  <DeliverySection
                    delivery={report.delivery}
                    scope={scope.kind === "period" ? scope : { kind: "milestone", title: milestones?.find((m) => m.id === scopeId)?.title ?? scopeId ?? "" }}
                  />
                </>
              ))
            ) : (
              reportBody((report) => <ReworkSection report={report} />)
            )}
          </section>
        </>
      )}
    </section>
  );
}
