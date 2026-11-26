import { lateOf } from "@/features/milestones/late";
import { formatDate } from "@/lib/dates";
import type { DaysPerPoint, MilestoneList } from "@/features/milestones/api";
import { oneDecimal, plural } from "@/features/milestones/format";
import type { Report } from "./api";
import type { BugsReport } from "./bugs/bugsApi";
import { formatDays, formatPercent } from "./format";
import type { ReportSection } from "./sections";
import { selectedStatusMilestone, type StatusReport } from "./status/statusApi";
import { statusVerdict } from "./status/verdict";
import { lateDays } from "./team/format";
import { selectedMilestone, UNASSIGNED, type TeamReport } from "./teamApi";

export type Headline = { text: string; warn: boolean };

/** REQ-UI-095: the Status section headline is its verdict word, with a warning icon for At risk, Late and Finished late; null for a period. */
export function statusHeadline(report: StatusReport, list: MilestoneList | null): Headline | null {
  if (report.days !== null) return null;
  const milestone = selectedStatusMilestone(report);
  if (milestone === null) return null;
  const finish = list?.milestones.find((m) => m.id === milestone.id)?.finish ?? null;
  const unsplit = report.epics.filter((e) => e.status !== "closed" && e.child_counts.total === 0).length;
  const verdict = statusVerdict(report, milestone, finish, unsplit);
  return { text: verdict.word, warn: verdict.tone === "risk" || verdict.tone === "late" };
}

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

/** REQ-UI-095: the Bugs section headline counts the open bugs of the project. */
export function bugsHeadline(report: BugsReport): Headline {
  const open = report.figures.open_now;
  return { text: open === 0 ? "No open bugs" : plural(open, "open bug"), warn: false };
}
