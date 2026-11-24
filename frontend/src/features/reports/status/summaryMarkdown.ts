import type { ForecastEpic, MilestoneDetail } from "@/features/milestones/api";
import { formatRange } from "@/lib/dates";
import type { TeamMilestone } from "../teamApi";
import type { StatusReport } from "./statusApi";
import { epicRows, kpiFigures, riskItems, type RiskItem } from "./statusView";
import type { StatusVerdict } from "./verdict";

export type StatusSummaryInput = {
  report: StatusReport;
  milestone: TeamMilestone;
  verdict: StatusVerdict;
  detail: MilestoneDetail | null;
  forecast: readonly ForecastEpic[] | null;
};

const cell = (text: string): string => text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");

function riskLine(item: RiskItem): string {
  switch (item.kind) {
    case "blocked":
      return `${item.text} (${item.note})`;
    case "more":
      return item.text;
    case "unestimated":
    case "unapproved":
      return `${item.text}: ${item.items.map((i) => i.title).join(", ")}`;
  }
}

/** REQ-REPORTS-037: the Markdown status summary of a loaded milestone, from the same helpers the Status section renders. */
export function summaryMarkdown({ report, milestone, verdict, detail, forecast }: StatusSummaryInput): string {
  const { today } = report;
  const title = `# ${milestone.title} (${formatRange(milestone.start, milestone.end, today)})`;
  const kpis = kpiFigures(report.kpis, milestone, today).map((f) => `- ${f.label}: ${f.value}${f.sub !== null ? ` (${f.sub})` : ""}`);
  const risks = riskItems(report.risks, detail).map((item) => `- ${riskLine(item)}`);
  const epics = epicRows(report.epics, detail, forecast, today).map((row) => {
    const { total, closed } = row.epic.child_counts;
    const progress = total === 0 ? "Not split yet" : `${closed} of ${total} tracks`;
    return `| ${[row.epic.title, row.verdictText, progress, row.planned, row.forecast, row.epic.person].map(cell).join(" | ")} |`;
  });

  return [
    title,
    "",
    `Generated: ${today}`,
    "",
    `**Verdict:** ${verdict.word} — ${verdict.sentence}`,
    "",
    "## KPIs",
    "",
    ...kpis,
    "",
    "## Risks",
    "",
    ...(risks.length > 0 ? risks : ["None."]),
    "",
    "## Epics",
    "",
    "| Epic | Verdict | Progress | Planned | Forecast | Assignee |",
    "| --- | --- | --- | --- | --- | --- |",
    ...epics,
    "",
  ].join("\n");
}
