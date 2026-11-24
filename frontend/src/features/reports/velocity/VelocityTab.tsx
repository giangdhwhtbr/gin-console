import { MilestonesError, type MilestoneList } from "@/features/milestones/api";
import { MilestoneError } from "@/features/milestones/MilestoneError";
import { VelocityCharts } from "./VelocityCharts";
import { VelocityFigures } from "./VelocityFigures";
import { VelocityTable } from "./VelocityTable";
import { latestSayDo, velocityMilestones } from "./velocity";

function VelocityBody({ list, selected }: { list: MilestoneList; selected: string | null }) {
  const points = velocityMilestones(list);
  return (
    <>
      <VelocityFigures daysPerPoint={list.days_per_point} latest={latestSayDo(list)} />
      {points.length === 0 ? (
        <p className="text-muted-foreground">No kicked-off milestones with points yet</p>
      ) : (
        <>
          <VelocityCharts points={points} selected={selected} />
          <VelocityTable points={points} selected={selected} />
        </>
      )}
    </>
  );
}

/**
 * REQ-REPORTS-018: Velocity of the current project, from the Milestones list the page already asked for (REQ-UI-095). An answer
 * that failed shows the page's failure, and only the user's Retry asks again, through `onRetry`. `selected` is the milestone of
 * the scope (REQ-REPORTS-033), marked in the charts and the table; null for a period.
 */
export function VelocityTab({ answer, onRetry, selected }: { answer: MilestoneList | MilestonesError; onRetry: () => void; selected: string | null }) {
  return (
    <section className="flex flex-col gap-4">
      {answer instanceof MilestonesError ? <MilestoneError error={answer} onRetry={onRetry} /> : <VelocityBody list={answer} selected={selected} />}
    </section>
  );
}
