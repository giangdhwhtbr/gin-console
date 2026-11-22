import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { workdaysAfter } from "@/features/milestones/format";
import { lateOf } from "@/features/milestones/late";
import { MilestoneStatus } from "@/features/milestones/MilestoneStatus";
import { formatDate, formatRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TeamMilestone, TeamReport } from "../teamApi";
import { lateDays } from "./format";

/** The chip of the milestone line: how a closed milestone ended, else the milestone status and " · late" by REQ-MILESTONE-UI-023. */
function Chip({ milestone, finish, today }: { milestone: TeamMilestone; finish: string | null; today: string }) {
  if (milestone.status === "closed") {
    const late = lateDays(milestone);
    return (
      <Badge variant="outline" className={cn(late > 0 && "text-state-blocked")}>
        {late > 0 ? `Closed · ${late} d late` : "Closed · on time"}
      </Badge>
    );
  }
  const late = lateOf({ status: milestone.status, end: milestone.end, finish, closedOn: milestone.closed_on }, today);
  return (
    <Badge variant="outline" className={cn(late && "text-state-blocked")}>
      <MilestoneStatus status={milestone.status} />
      {late && (
        <>
          <TriangleAlert aria-hidden className="size-3.5" />
          {" · late"}
        </>
      )}
    </Badge>
  );
}

export function MilestoneLine({ report, milestone, finish }: { report: TeamReport; milestone: TeamMilestone; finish: string | null }) {
  const { team, today } = report;
  let progress: string | null = null;
  if (milestone.status === "closed" && milestone.closed_on !== null) progress = `finished ${formatDate(milestone.closed_on, today)}`;
  else if (today < milestone.start) progress = `starts in ${workdaysAfter(today, milestone.start)} working days`;
  else if (today <= milestone.end && team !== null) progress = `working day ${team.elapsed} of ${team.working_days} · ${team.days_left} left`;
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
