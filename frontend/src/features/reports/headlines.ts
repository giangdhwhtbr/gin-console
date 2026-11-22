import { lateOf } from "@/features/milestones/late";
import { formatDate } from "@/lib/dates";
import type { DaysPerPoint } from "@/features/milestones/api";
import { oneDecimal } from "@/features/milestones/format";
import type { QualityRow, Report } from "./api";
import type { ReportTab } from "./filters";
import { formatCost, formatDays, formatPercent, formatTokens } from "./format";
import { lateDays } from "./team/format";
import { selectedMilestone, type TeamReport } from "./teamApi";

export type Headline = { text: string; warn: boolean };

export function gapCount(report: Report): number {
  const c = report.coverage;
  return c.not_collected.length + c.invalid.length + c.unpriced.length + c.sources.length + report.errors.length;
}

/** `finish` is the forecast of the selected milestone from the Milestones list, `null` while that has not loaded. */
export function teamHeadline(report: TeamReport, finish: string | null): Headline {
  const milestone = selectedMilestone(report);
  const { team } = report;
  if (milestone === null || team === null) return { text: "No milestones", warn: false };
  if (milestone.status === "closed") {
    const late = lateOf({ status: milestone.status, end: milestone.end, closedOn: milestone.closed_on }, report.today);
    return late ? { text: `Finished ${lateDays(milestone)} d late`, warn: true } : { text: "Finished on time", warn: false };
  }
  if (report.today < milestone.start) return { text: `Starts ${formatDate(milestone.start, report.today)}`, warn: false };
  const progress = `${team.closed} of ${team.scope} done`;
  if (lateOf({ status: milestone.status, end: milestone.end, finish }, report.today)) return { text: `${progress} · late`, warn: true };
  if (team.pace_needed !== null && team.pace_needed > team.pace) return { text: `${progress} · behind pace`, warn: true };
  return { text: `${progress} · on pace`, warn: false };
}

export function velocityHeadline(daysPerPoint: DaysPerPoint | null): Headline | null {
  if (daysPerPoint === null) return null;
  return { text: `${oneDecimal(daysPerPoint.value)} days per point${daysPerPoint.assumed ? " assumed" : ""}`, warn: false };
}

export function headlines(report: Report): Record<Exclude<ReportTab, "team" | "velocity">, Headline> {
  const { totals } = report;
  const gaps = gapCount(report);
  return {
    delivery: { text: `${totals.closed} beads closed`, warn: false },
    usage: { text: `${formatTokens(totals.tokens)} tokens, ${formatCost(totals.cost)}`, warn: false },
    quality: { text: `${formatPercent(totals.rework_rate)} rework`, warn: false },
    coverage: { text: gaps === 1 ? "1 gap" : `${gaps} gaps`, warn: gaps > 0 },
  };
}

export function figures(tab: ReportTab, report: Report): [string, string][] {
  const { totals, delivery, quality } = report;
  const sum = (pick: (r: QualityRow) => number) => quality.members.reduce((n, r) => n + pick(r), 0);
  switch (tab) {
    case "team":
      return [];
    case "delivery":
      return [
        ["Beads closed", String(totals.closed)],
        ["Median cycle time", formatDays(delivery.overall.cycle?.median ?? null)],
        ["Median lead time", formatDays(delivery.overall.lead?.median ?? null)],
      ];
    case "velocity":
      return [];
    case "usage":
      return [
        ["Tokens", formatTokens(totals.tokens)],
        ["Estimated cost", formatCost(totals.cost)],
        ["Tokens per closed bead", totals.tokens_per_bead === null ? "—" : formatTokens(totals.tokens_per_bead)],
        ["Cache reads", formatPercent(totals.cache_ratio)],
      ];
    case "quality": {
      const beads = sum((r) => r.beads);
      return [
        ["Rework rate", formatPercent(totals.rework_rate)],
        ["Reopens", String(sum((r) => r.reopens))],
        ["Bugs found later", String(sum((r) => r.bugs))],
        ["Review cycles per bead", beads === 0 ? "—" : (sum((r) => r.review_cycles) / beads).toFixed(1)],
      ];
    }
    case "coverage":
      return [];
  }
}
