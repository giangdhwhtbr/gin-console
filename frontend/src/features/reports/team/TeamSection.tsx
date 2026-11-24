import { Link } from "@/app/Link";
import { Button } from "@/components/ui/button";
import { milestonePath } from "@/features/milestones/api";
import type { ReportFilters } from "../filters";
import { selectedMilestone, UNASSIGNED, type TeamReport } from "../teamApi";
import { AcrossMilestones } from "./AcrossMilestones";
import { BeadTable } from "./BeadTable";
import { ClosedPerDayChart } from "./ClosedPerDayChart";
import { MemberTable } from "./MemberTable";
import { MilestoneLine } from "./MilestoneLine";
import { TeamFigures } from "./TeamFigures";
import { UnassignedNote } from "./UnassignedNote";

const selectClass = "min-w-0 max-w-full rounded border bg-background px-2 py-1 text-sm";
const labelClass = "flex min-w-0 max-w-full items-center gap-2 text-sm text-muted-foreground";

export function TeamSection({
  project,
  report,
  filters,
  finish,
  onChange,
}: {
  project: string;
  report: TeamReport;
  filters: ReportFilters;
  /** The forecast finish of the selected milestone from the Milestones list, when it has loaded (REQ-MILESTONE-UI-023). */
  finish: string | null;
  onChange: (next: ReportFilters) => void;
}) {
  // the scope comes from the page's scope select (REQ-REPORTS-033): a milestone, or a period with no milestone
  const milestone = selectedMilestone(report);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className={labelClass}>
          Member
          <select
            aria-label="Member"
            value={filters.member}
            onChange={(event) => onChange({ ...filters, member: event.target.value })}
            className={selectClass}
          >
            <option value="">All members ({report.members.length})</option>
            {report.members.map((m) => (
              <option key={m.member} value={m.member}>
                {m.member} ({m.scope})
              </option>
            ))}
          </select>
        </label>
        {filters.member !== "" && (
          <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...filters, member: "" })}>
            Clear member
          </Button>
        )}
        {milestone !== null && (
          <Link to={milestonePath(project, milestone.id)} className="text-sm hover:text-identity">
            Open Gantt
          </Link>
        )}
      </div>
      <MilestoneLine report={report} milestone={milestone} finish={finish} />
      {report.undated > 0 && (
        <p className="text-sm text-muted-foreground">{report.undated} milestones without start and end dates are not listed</p>
      )}
      {report.team !== null && (
        <div data-slot="team-body" className="flex flex-col gap-8">
          <TeamFigures team={report.team} member={report.members.find((m) => m.member === filters.member) ?? null} milestone={milestone} />
          <ClosedPerDayChart
            days={report.days}
            members={report.members.map((m) => m.member)}
            selected={filters.member}
            today={report.today}
            milestone={milestone}
          />
          <AcrossMilestones project={project} trend={report.trend} selected={report.milestone} />
          <div className="flex flex-col gap-3">
            <UnassignedNote unassigned={report.unassigned} />
            <MemberTable members={report.members} selected={filters.member} onSelect={(member) => onChange({ ...filters, member })} />
          </div>
          <BeadTable
            project={project}
            beads={filters.member === "" ? report.beads : report.beads.filter((b) => (b.assignee ?? UNASSIGNED) === filters.member)}
            member={filters.member}
            status={filters.status || (milestone === null || milestone.status === "closed" ? "closed" : "open")}
            onStatus={(status) => onChange({ ...filters, status })}
            today={report.today}
            scope={milestone === null ? "period" : "milestone"}
          />
        </div>
      )}
    </div>
  );
}
