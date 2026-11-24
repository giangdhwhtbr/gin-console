import { useEffect, useState } from "react";
import { fetchMilestone, type MilestoneDetail, type MilestoneList } from "@/features/milestones/api";
import { plural, workdaysAfter } from "@/features/milestones/format";
import { formatDate, formatRange } from "@/lib/dates";
import { BurnupChart } from "./BurnupChart";
import { ChangesPanel } from "./ChangesPanel";
import { CopySummaryButton } from "./CopySummaryButton";
import { EpicTable } from "./EpicTable";
import { RisksPanel } from "./RisksPanel";
import { selectedStatusMilestone, type StatusReport } from "./statusApi";
import { StatusFigures } from "./StatusFigures";
import { summaryMarkdown } from "./summaryMarkdown";
import { statusVerdict } from "./verdict";
import { VerdictPanel } from "./VerdictPanel";

export type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; plan: MilestoneDetail };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

function subtitleOf(report: StatusReport, start: string, end: string, status: string, closedOn: string | null): string {
  const base = `Milestone report, ${formatRange(start, end, report.today)}.`;
  if (status === "closed" && closedOn !== null) return `${base} Finished ${formatDate(closedOn, report.today)}.`;
  if (report.today < start) return `${base} Starts in ${plural(workdaysAfter(report.today, start), "working day")}.`;
  if (report.period !== null) return `${base} Working day ${report.period.elapsed} of ${report.period.working_days}.`;
  return base;
}

/**
 * REQ-REPORTS-028, 030, 031, 032: the Status section for a milestone.
 * Fetches the milestone detail on its own and ignores late answers; renders cleanly while the detail or list loads or fails.
 */
export function StatusSection({
  project,
  report,
  list,
  detail: providedDetail,
}: {
  project: string;
  report: StatusReport;
  list: MilestoneList | null;
  detail?: DetailState;
}) {
  const milestone = selectedStatusMilestone(report);
  const milestoneId = milestone?.id ?? null;
  const key = milestoneId !== null ? `${project}\0${milestoneId}` : null;
  const [settled, setSettled] = useState<{ key: string; value: DetailState } | null>(null);

  useEffect(() => {
    if (providedDetail !== undefined || milestoneId === null || key === null) return;
    let live = true;
    fetchMilestone(project, milestoneId, null).then(
      (plan) => {
        if (live) setSettled({ key, value: { status: "ok", plan } });
      },
      (error: unknown) => {
        if (live) setSettled({ key, value: { status: "error", message: messageOf(error) } });
      },
    );
    return () => {
      live = false;
    };
  }, [project, milestoneId, key, providedDetail]);

  if (milestone === null) return null;

  const detailState: DetailState =
    providedDetail ?? (settled !== null && settled.key === key ? settled.value : { status: "loading" });
  const plan = detailState.status === "ok" ? detailState.plan : null;

  const finish = list?.milestones.find((m) => m.id === milestone.id)?.finish ?? null;
  const forecastEpics = list?.forecast?.epics ?? null;
  const unsplit = report.epics.filter((e) => e.status !== "closed" && e.child_counts.total === 0).length;
  const verdict = statusVerdict(report, milestone, finish, unsplit);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold">{milestone.title}</h2>
          <p className="text-sm text-muted-foreground">
            {subtitleOf(report, milestone.start, milestone.end, milestone.status, milestone.closed_on)}
          </p>
        </div>
        <CopySummaryButton buildText={() => summaryMarkdown({ report, milestone, verdict, detail: plan, forecast: forecastEpics })} />
      </div>

      <VerdictPanel verdict={verdict} />
      <StatusFigures kpis={report.kpis} milestone={milestone} today={report.today} />

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {report.epics.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No epics in this milestone yet</div>
          ) : report.burnup.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
              Starts {formatDate(milestone.start, report.today)}
            </div>
          ) : (
            <BurnupChart
              burnup={report.burnup}
              end={milestone.end}
              today={report.today}
              paceFinish={verdict.paceFinish}
              changes={report.changes}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <ChangesPanel project={project} changes={report.changes} today={report.today} />
          <RisksPanel project={project} risks={report.risks} detail={plan} />
        </div>
      </div>

      {report.epics.length > 0 && (
        <EpicTable project={project} epics={report.epics} detail={plan} forecast={forecastEpics} today={report.today} />
      )}
    </div>
  );
}
