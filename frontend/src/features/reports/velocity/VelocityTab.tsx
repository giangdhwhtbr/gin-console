import { useCallback } from "react";
import { fetchMilestones, type MilestoneList, type MilestonesError } from "@/features/milestones/api";
import { MilestoneError } from "@/features/milestones/MilestoneError";
import { useLoad } from "@/features/milestones/useLoad";
import { VelocityCharts } from "./VelocityCharts";
import { VelocityFigures } from "./VelocityFigures";
import { VelocityTable } from "./VelocityTable";
import { latestSayDo, velocityMilestones } from "./velocity";

function VelocityBody({ list }: { list: MilestoneList }) {
  const points = velocityMilestones(list);
  return (
    <>
      <VelocityFigures daysPerPoint={list.days_per_point} latest={latestSayDo(list)} />
      {points.length === 0 ? (
        <p className="text-muted-foreground">No kicked-off milestones with points yet</p>
      ) : (
        <>
          <VelocityCharts points={points} />
          <VelocityTable points={points} />
        </>
      )}
    </>
  );
}

/** A project the page has not loaded: it asks for its Milestones list itself. */
function RequestedVelocity({ project }: { project: string }) {
  const fetcher = useCallback(() => fetchMilestones(project), [project]);
  const { state, retry } = useLoad(fetcher, false);
  return (
    <>
      {state.status === "loading" && <p className="text-muted-foreground">Loading velocity…</p>}
      {state.status === "error" && <MilestoneError error={state.error} onRetry={retry} />}
      {state.status === "ok" && <VelocityBody list={state.data} />}
    </>
  );
}

/**
 * REQ-REPORTS-018: one independent block per project. A project in `loaded` (REQ-UI-095) is not requested again; one in `failed`
 * shows the page's failure, and only the user's Retry asks again, through `onRetry`.
 */
export function VelocityTab({
  projects,
  loaded,
  failed,
  onRetry,
}: {
  projects: readonly string[];
  loaded: ReadonlyMap<string, MilestoneList>;
  failed: ReadonlyMap<string, MilestonesError>;
  onRetry: (project: string) => void;
}) {
  return (
    <>
      {projects.map((project) => {
        const list = loaded.get(project);
        const error = failed.get(project);
        return (
          <section key={project} className="flex flex-col gap-4">
            {projects.length > 1 && <h2 className="font-semibold">{project}</h2>}
            {list !== undefined ? (
              <VelocityBody list={list} />
            ) : error !== undefined ? (
              <MilestoneError error={error} onRetry={() => onRetry(project)} />
            ) : (
              <RequestedVelocity project={project} />
            )}
          </section>
        );
      })}
    </>
  );
}
