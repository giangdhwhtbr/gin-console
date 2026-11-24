import { TriangleAlert } from "lucide-react";
import { utcOf, workdaysAfter } from "@/features/milestones/format";
import { lateOf } from "@/features/milestones/late";
import { MilestoneStatus } from "@/features/milestones/MilestoneStatus";
import { formatDate, formatRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TeamMilestone, TeamReport } from "../teamApi";
import { lateDays } from "./format";

/** The status text of the milestone line (REQ-UI-140): how a closed milestone ended, else the milestone status and ", late" by REQ-MILESTONE-UI-023. */
function Chip({ milestone, finish, today }: { milestone: TeamMilestone; finish: string | null; today: string }) {
  if (milestone.status === "closed") {
    const late = lateOf({ status: milestone.status, end: milestone.end, closedOn: milestone.closed_on }, today);
    return (
      <span data-milestone-status className={cn("text-sm", late ? "text-state-blocked" : "text-muted-foreground")}>
        {late ? `Closed, ${lateDays(milestone)} d late` : "Closed, on time"}
      </span>
    );
  }
  const late = lateOf({ status: milestone.status, end: milestone.end, finish, closedOn: milestone.closed_on }, today);
  return (
    <span data-milestone-status className={cn("inline-flex items-center gap-1 text-sm", late && "text-state-blocked")}>
      <MilestoneStatus status={milestone.status} />
      {late && (
        <>
          <TriangleAlert aria-hidden className="size-3.5" />
          {", late"}
        </>
      )}
    </span>
  );
}

const DAY_MS = 86_400_000;
const daysBefore = (day: string, days: number): string => new Date(utcOf(day).getTime() - days * DAY_MS).toISOString().slice(0, 10);

/** REQ-REPORTS-012: the scope line, of the selected milestone or of the period; nothing for a report with neither. */
export function MilestoneLine({ report, milestone, finish }: { report: TeamReport; milestone: TeamMilestone | null; finish: string | null }) {
  const { team, today } = report;
  if (milestone === null) {
    if (report.period_days === null) return null;
    return <h2 className="font-semibold">{`Last ${report.period_days} days, ${formatRange(daysBefore(today, report.period_days), today, today)}`}</h2>;
  }
  let progress: string | null = null;
  if (milestone.status === "closed" && milestone.closed_on !== null) progress = `finished ${formatDate(milestone.closed_on, today)}`;
  else if (today < milestone.start) progress = `starts in ${workdaysAfter(today, milestone.start)} working days`;
  else if (today <= milestone.end && team !== null && team.working_days !== null)
    progress = `working day ${team.elapsed} of ${team.working_days}, ${team.days_left} left`;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="font-semibold">{milestone.title}</h2>
      <Chip milestone={milestone} finish={finish} today={today} />
      <span className="text-sm text-muted-foreground">
        {formatRange(milestone.start, milestone.end, today)}
      </span>
      {progress !== null && <span className="text-sm text-muted-foreground">{progress}</span>}
    </div>
  );
}
