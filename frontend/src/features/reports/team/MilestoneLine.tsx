import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TeamMilestone, TeamReport } from "../teamApi";
import { formatDate, lateDays, workdaysAfter } from "./format";

const STATUS_LABEL = { active: "Active", scheduled: "Scheduled", planned: "Planned", closed: "Closed" } as const;

function chipText(m: TeamMilestone): string {
  if (m.status !== "closed") return STATUS_LABEL[m.status];
  const late = lateDays(m);
  return late > 0 ? `Closed · ${late} d late` : "Closed · on time";
}

export function MilestoneLine({ report, milestone }: { report: TeamReport; milestone: TeamMilestone }) {
  const { team, today } = report;
  let progress: string | null = null;
  if (milestone.status === "closed" && milestone.closed_on !== null) progress = `finished ${formatDate(milestone.closed_on)}`;
  else if (today < milestone.start) progress = `starts in ${workdaysAfter(today, milestone.start)} working days`;
  else if (today <= milestone.end && team !== null) progress = `working day ${team.elapsed} of ${team.working_days} · ${team.days_left} left`;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="font-semibold">{milestone.title}</h2>
      <Badge variant="outline" className={cn(milestone.status === "closed" && lateDays(milestone) > 0 && "text-state-blocked")}>
        {chipText(milestone)}
      </Badge>
      <span className="text-sm text-muted-foreground">
        {formatDate(milestone.start)} – {formatDate(milestone.end)}
      </span>
      {progress !== null && <span className="text-sm text-muted-foreground">{progress}</span>}
    </div>
  );
}
