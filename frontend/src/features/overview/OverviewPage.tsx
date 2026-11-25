import { useRestoreOnBack } from "@/app/route";
import { usePageTitle } from "@/app/usePageTitle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AssigneeName } from "@/features/beads/AssigneeName";
import { StaleNote } from "@/features/beads/StaleNote";
import { useLoad } from "@/features/milestones/useLoad";
import { countHint } from "@/lib/definitions";
import { fetchOverview, type Overview } from "./api";
import { AttentionSection } from "./AttentionSection";
import { BeadLink } from "./BeadLink";
import { GatesSection, useGates, WaiversSection } from "./GateSections";
import { MilestoneLines } from "./MilestoneLines";
import { agingRows, blockedRows, unassignedRows } from "./merge";
import { WorkloadSection } from "./WorkloadSection";

const SCOPE = "all projects";
const META = "text-xs text-muted-foreground";
const rowKey = (project: string, id: string) => JSON.stringify([project, id]);

function Loaded({ data: { projects, aging_days: agingDays } }: { data: Overview }) {
  const gates = useGates(projects);
  if (projects.length === 0) return <p className="text-muted-foreground">No projects configured.</p>;
  return (
    <>
      <StaleNote projects={projects.filter((p) => p.error === null && p.stale).map((p) => p.name)} />
      {projects.map(
        ({ name, error }) =>
          error !== null && (
            <Alert key={name} variant="destructive">
              <AlertTitle>{`${name} could not be loaded`}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ),
      )}
      <MilestoneLines projects={projects} />
      <div className="flex min-w-0 flex-col gap-4">
        <h2 className="text-xl font-semibold">Needs attention</h2>
        <AttentionSection
          title="Blocked"
          hint={countHint("blocked", SCOPE)}
          rows={blockedRows(projects).map(({ project, bead }) => ({
            key: rowKey(project, bead.id),
            id: bead.id,
            content: (
              <>
                <BeadLink project={project} id={bead.id} title={bead.title} />
                <span className={META}>{project}</span>
                <AssigneeName assignee={bead.assignee} className="text-xs" />
                <span className={META}>{`waits ${bead.days} d`}</span>
                {bead.blocker !== null && (
                  <span className="min-w-0">
                    <span className={META}>on</span> <BeadLink project={project} id={bead.blocker.id} title={bead.blocker.title} /> <span className={META}>{bead.blocker.person}</span>
                  </span>
                )}
              </>
            ),
          }))}
        />
        <AttentionSection
          title={`In progress > ${agingDays} days`}
          hint={countHint("overviewAging", SCOPE)}
          rows={agingRows(projects).map(({ project, bead }) => ({
            key: rowKey(project, bead.id),
            id: bead.id,
            content: (
              <>
                <BeadLink project={project} id={bead.id} title={bead.title} />
                <span className={META}>{project}</span>
                <AssigneeName assignee={bead.assignee} className="text-xs" />
                <span className={META}>{`${bead.days} d`}</span>
              </>
            ),
          }))}
        />
        <GatesSection gates={gates} />
        <WaiversSection gates={gates} />
        <AttentionSection
          title="Unassigned ready"
          hint={countHint("overviewUnassigned", SCOPE)}
          rows={unassignedRows(projects).map(({ project, bead }) => ({
            key: rowKey(project, bead.id),
            id: bead.id,
            content: (
              <>
                <BeadLink project={project} id={bead.id} title={bead.title} />
                <span className={META}>{project}</span>
                {bead.priority !== null && <span className={META}>{`P${bead.priority}`}</span>}
              </>
            ),
          }))}
        />
      </div>
      <WorkloadSection projects={projects} />
    </>
  );
}

/** The lead's page over all projects (REQ-OVERVIEW-005, REQ-OVERVIEW-007 to 011). */
export function OverviewPage() {
  usePageTitle("Overview");
  const { state, retry } = useLoad(fetchOverview, true);
  useRestoreOnBack(state.status === "ok");
  const failure = state.status === "loading" ? null : state.error;
  return (
    // a long name or id breaks anywhere instead of widening the page (REQ-OVERVIEW-011)
    <section className="flex min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
      <h1 className="text-2xl font-semibold">Overview</h1>
      {state.status === "loading" && <p className="text-muted-foreground">Loading overview…</p>}
      {failure !== null && (
        <Alert variant="destructive">
          <AlertTitle>The overview could not be loaded</AlertTitle>
          <AlertDescription>{failure.message}</AlertDescription>
        </Alert>
      )}
      {state.status === "error" && (
        <Button variant="outline" className="self-start" onClick={retry}>
          Retry
        </Button>
      )}
      {state.status === "ok" && <Loaded data={state.data} />}
    </section>
  );
}
