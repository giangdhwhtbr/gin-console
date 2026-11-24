import { lateOf } from "@/features/milestones/late";
import { formatDate } from "@/lib/dates";
import type { DaysPerPoint } from "@/features/milestones/api";
import { oneDecimal, plural } from "@/features/milestones/format";
import type { Report } from "./api";
import { formatDays, formatPercent } from "./format";
import type { ReportSection } from "./sections";
import { lateDays } from "./team/format";
import { selectedMilestone, UNASSIGNED, type TeamReport } from "./teamApi";

export type Headline = { text: string; warn: boolean };

/** `finish` is the forecast of the selected milestone from the Milestones list, `null` while that has not loaded. */
export function teamHeadline(report: TeamReport, finish: string | null): Headline {
  if (report.period_days !== null) return { text: plural(report.members.filter((m) => m.member !== UNASSIGNED).length, "member"), warn: false };
  const milestone = selectedMilestone(report);
  const { team } = report;
  if (milestone === null || team === null) return { text: "No milestones", warn: false };
  if (milestone.status === "closed") {
    const late = lateOf({ status: milestone.status, end: milestone.end, closedOn: milestone.closed_on }, report.today);
    return late ? { text: `Finished ${lateDays(milestone)} d late`, warn: true } : { text: "Finished on time", warn: false };
  }
  if (report.today < milestone.start) return { text: `Starts ${formatDate(milestone.start, report.today)}`, warn: false };
  const progress = `${team.closed} of ${team.scope} done`;
  if (lateOf({ status: milestone.status, end: milestone.end, finish }, report.today)) return { text: `${progress}, late`, warn: true };
  if (team.pace_needed !== null && team.pace_needed > team.pace) return { text: `${progress}, behind pace`, warn: true };
  return { text: `${progress}, on pace`, warn: false };
}

export function velocityHeadline(daysPerPoint: DaysPerPoint | null): Headline | null {
  if (daysPerPoint === null) return null;
  return { text: `${oneDecimal(daysPerPoint.value)} days per point${daysPerPoint.assumed ? " assumed" : ""}`, warn: false };
}

export function headlines(report: Report): Record<"delivery" | "rework", Headline> {
  const { totals } = report;
  return {
    delivery: { text: `${totals.closed} beads closed`, warn: false },
    rework: { text: `${formatPercent(totals.rework_rate)} rework`, warn: false },
  };
}

export function figures(section: ReportSection, report: Report): [string, string][] {
  const { totals, delivery } = report;
  if (section !== "delivery") return [];
  return [
    ["Beads closed", String(totals.closed)],
    ["Median cycle time", formatDays(delivery.overall.cycle?.median ?? null)],
    ["Median lead time", formatDays(delivery.overall.lead?.median ?? null)],
  ];
}
