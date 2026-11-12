import { Link } from "@/app/Link";
import { Button } from "@/components/ui/button";
import { milestonePath } from "@/features/milestones/api";
import { CopyCommand } from "@/features/milestones/CopyCommand";
import type { ReportFilters } from "../filters";
import { selectedMilestone, type TeamMilestone, type TeamReport } from "../teamApi";
import { MilestoneLine } from "./MilestoneLine";

const selectClass = "rounded border bg-background px-2 py-1 text-sm";

const byStart = (a: TeamMilestone, b: TeamMilestone) => a.start.localeCompare(b.start);
const byEndDesc = (a: TeamMilestone, b: TeamMilestone) => b.end.localeCompare(a.end);

export function TeamSection({
  project,
  report,
  filters,
  onChange,
}: {
  project: string;
  report: TeamReport;
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
}) {
  if (report.milestones.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-semibold">{project} has no milestones yet</p>
        <p className="text-sm text-muted-foreground">A milestone groups epics under a start and end date, so the team can follow its pace.</p>
        <CopyCommand command="gin-workflow milestone create" />
      </div>
    );
  }
  const milestone = selectedMilestone(report);
  const groups: [string, TeamMilestone[]][] = [
    ["Active", report.milestones.filter((m) => m.status === "active")],
    ["Planned", report.milestones.filter((m) => m.status === "scheduled" || m.status === "planned").sort(byStart)],
    ["Closed", report.milestones.filter((m) => m.status === "closed").sort(byEndDesc)],
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Milestone
          <select
            aria-label="Milestone"
            value={report.milestone ?? ""}
            onChange={(event) => onChange({ ...filters, milestone: event.target.value, member: "", status: "" })}
            className={selectClass}
          >
            {groups
              .filter(([, list]) => list.length > 0)
              .map(([label, list]) => (
                <optgroup key={label} label={label}>
                  {list.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
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
                {m.member} · {m.scope}
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
          <Link to={milestonePath(project, milestone.id)} className="text-sm underline">
            Open Gantt
          </Link>
        )}
      </div>
      {milestone !== null && <MilestoneLine report={report} milestone={milestone} />}
      {report.undated > 0 && (
        <p className="text-sm text-muted-foreground">{report.undated} milestones without start and end dates are not listed</p>
      )}
      {report.team !== null && <div data-slot="team-body" className="flex flex-col gap-8" />}
    </div>
  );
}
