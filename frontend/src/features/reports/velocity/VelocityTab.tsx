import { useCallback, useEffect } from "react";
import { fetchMilestones, type DaysPerPoint } from "@/features/milestones/api";
import { MilestoneError } from "@/features/milestones/MilestoneError";
import { useLoad } from "@/features/milestones/useLoad";
import { VelocityCharts } from "./VelocityCharts";
import { VelocityFigures } from "./VelocityFigures";
import { VelocityTable } from "./VelocityTable";
import { latestSayDo, velocityMilestones } from "./velocity";

function VelocityBlock({ project, named, onDaysPerPoint }: { project: string; named: boolean; onDaysPerPoint: (project: string, value: DaysPerPoint | null) => void }) {
  const fetcher = useCallback(() => fetchMilestones(project), [project]);
  const { state, retry } = useLoad(fetcher, false);
  const loaded = state.status === "ok" ? state.data : null;
  useEffect(() => {
    if (loaded !== null) onDaysPerPoint(project, loaded.days_per_point);
  }, [loaded, project, onDaysPerPoint]);
  const points = loaded === null ? [] : velocityMilestones(loaded);
  return (
    <section className="flex flex-col gap-4">
      {named && <h2 className="font-semibold">{project}</h2>}
      {state.status === "loading" && <p className="text-muted-foreground">Loading velocity…</p>}
      {state.status === "error" && <MilestoneError error={state.error} onRetry={retry} />}
      {loaded !== null && (
        <>
          <VelocityFigures daysPerPoint={loaded.days_per_point} latest={latestSayDo(points)} />
          {points.length === 0 ? (
            <p className="text-muted-foreground">No kicked-off milestones with points yet</p>
          ) : (
            <>
              <VelocityCharts points={points} />
              <VelocityTable points={points} />
            </>
          )}
        </>
      )}
    </section>
  );
}

/** REQ-REPORTS-018: one independent block per project; `onDaysPerPoint` feeds the tab's headline. */
export function VelocityTab({ projects, onDaysPerPoint }: { projects: readonly string[]; onDaysPerPoint: (project: string, value: DaysPerPoint | null) => void }) {
  return (
    <>
      {projects.map((project) => (
        <VelocityBlock key={project} project={project} named={projects.length > 1} onDaysPerPoint={onDaysPerPoint} />
      ))}
    </>
  );
}
