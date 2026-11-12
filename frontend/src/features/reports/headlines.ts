import type { QualityRow, Report } from "./api";
import type { ReportTab } from "./filters";
import { formatCost, formatDays, formatPercent, formatTokens } from "./format";
import { formatDate, lateDays } from "./team/format";
import { selectedMilestone, type TeamReport } from "./teamApi";

export type Headline = { text: string; warn: boolean };

export function gapCount(report: Report): number {
  const c = report.coverage;
  return c.not_collected.length + c.invalid.length + c.unpriced.length + c.sources.length + report.errors.length;
}

export function teamHeadline(report: TeamReport): Headline {
  const milestone = selectedMilestone(report);
  const { team } = report;
  if (milestone === null || team === null) return { text: "No milestones", warn: false };
  if (milestone.status === "closed") {
    const late = lateDays(milestone);
    return late > 0 ? { text: `Finished ${late} d late`, warn: true } : { text: "Finished on time", warn: false };
  }
  if (report.today < milestone.start) return { text: `Starts ${formatDate(milestone.start)}`, warn: false };
  const progress = `${team.closed} of ${team.scope} closed`;
  if (team.late_open > 0) return { text: `${progress} · past end`, warn: true };
  if (team.pace_needed !== null && team.pace_needed > team.pace) return { text: `${progress} · behind pace`, warn: true };
  return { text: `${progress} · on pace`, warn: false };
}

export function headlines(report: Report): Record<Exclude<ReportTab, "team">, Headline> {
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
