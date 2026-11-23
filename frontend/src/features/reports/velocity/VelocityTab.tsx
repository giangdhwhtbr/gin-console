import { MilestonesError, type MilestoneList } from "@/features/milestones/api";
import { MilestoneError } from "@/features/milestones/MilestoneError";
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

/**
 * REQ-REPORTS-018: Velocity of the current project, from the Milestones list the page already asked for (REQ-UI-095). An answer
 * that failed shows the page's failure, and only the user's Retry asks again, through `onRetry`.
 */
export function VelocityTab({ answer, onRetry }: { answer: MilestoneList | MilestonesError; onRetry: () => void }) {
  return (
    <section className="flex flex-col gap-4">
      {answer instanceof MilestonesError ? <MilestoneError error={answer} onRetry={onRetry} /> : <VelocityBody list={answer} />}
    </section>
  );
}
