import type { BeadDetail } from "./api";
import { laneRows, trackRows } from "./epicOverview";
import { LaneSummary } from "./LaneSummary";
import { MilestoneCard } from "./MilestoneCard";
import { ProgressCard } from "./ProgressCard";
import { TracksTable } from "./TracksTable";
import type { BeadsState } from "./useBeads";
import { WorkflowCard } from "./WorkflowCard";

/** REQ-UI-120, REQ-UI-121: the cards, the Lanes summary (when the epic has lanes) and the Tracks table above the description. */
export function EpicOverview({ project, bead, beads, lanesHref }: { project: string; bead: BeadDetail; beads: BeadsState; lanesHref: string }) {
  const loaded = beads.status === "ok" ? beads.beads : null;
  const rows = loaded === null ? [] : laneRows(loaded, bead.id, new Date());
  const lanes = rows.some((r) => r.lane !== null);
  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <ProgressCard bead={bead} beads={beads} />
        <WorkflowCard project={project} id={bead.id} />
        <MilestoneCard project={project} bead={bead} />
      </div>
      {loaded !== null && lanes && <LaneSummary beads={loaded} epicId={bead.id} rows={rows} lanesHref={lanesHref} />}
      {loaded !== null && <TracksTable project={project} epicId={bead.id} beads={loaded} rows={trackRows(loaded, bead.id)} />}
    </>
  );
}
