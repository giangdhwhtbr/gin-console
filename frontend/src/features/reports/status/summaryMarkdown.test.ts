import { describe, expect, it } from "vitest";
import type { ForecastEpic } from "@/features/milestones/api";
import { detail, epicPlan } from "@/features/milestones/milestoneFixtures";
import { statusEpic, statusMilestones, statusReport } from "./statusFixtures";
import { summaryMarkdown, type StatusSummaryInput } from "./summaryMarkdown";
import type { StatusVerdict } from "./verdict";

const verdict: StatusVerdict = {
  word: "At risk",
  tone: "risk",
  glyph: "deferred",
  dashed: true,
  sentence: "Pace is short of what the end date needs.",
  paceFinish: null,
};
const milestone = statusMilestones[1];
const forecast: ForecastEpic[] = [
  { id: "e-1", milestone: "m2", planned_start: "2026-11-23", planned_end: "2026-11-25", estimate_source: "points" },
];
const closedCounts = { total: 2, closed: 2, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 };

const input = (over: Partial<StatusSummaryInput> = {}): StatusSummaryInput => ({
  report: statusReport({
    risks: {
      blocked: [{ id: "t-3", title: "End-to-end checkout QA", days: 4, blocker: { id: "t-8", title: "Mobile layout", person: "bao", blocked: true } }],
      blocked_more: 0,
      unestimated: [],
    },
    epics: [
      statusEpic("e-2", { title: "Cart totals", status: "closed", person: "ann", closed_on: "2026-11-20", child_counts: closedCounts }),
      statusEpic("e-1", { title: "Team checkout" }),
    ],
  }),
  milestone,
  verdict,
  detail: detail([
    epicPlan("e-1", { planned_start: "2026-11-11", planned_end: "2026-11-20", warnings: [{ code: "late", days: 3, count: null }] }),
    epicPlan("e-2", { status: "closed", planned_start: "2026-11-12", planned_end: "2026-11-19" }),
  ]),
  forecast,
  ...over,
});

describe("summaryMarkdown", () => {
  it("REQ-REPORTS-037 Full status summary: title, verdict, 5 KPI bullets, risk bullet and epics table in EpicTable order", () => {
    expect(summaryMarkdown(input())).toBe(
      [
        "# Checkout v2 (11 Nov – 2 Dec)",
        "",
        "Generated: 2026-11-23",
        "",
        "**Verdict:** At risk — Pace is short of what the end date needs.",
        "",
        "## KPIs",
        "",
        "- Beads done: 13 of 35 (+6 this week)",
        "- Points done: 9.5 of 27 (+3 added after kickoff)",
        "- Pace: 2.0 a day (needs 2.8 to end on 2 Dec)",
        "- Blocked: 1 (oldest waiting 4 days)",
        "- Rework: 31% (up from 18% last week)",
        "",
        "## Risks",
        "",
        "- End-to-end checkout QA waits on Mobile layout (Mobile layout is blocked too, bao, 4 days)",
        "",
        "## Epics",
        "",
        "| Epic | Verdict | Progress | Planned | Forecast | Assignee |",
        "| --- | --- | --- | --- | --- | --- |",
        "| Team checkout | Late: should have finished 20 Nov | 2 of 4 tracks | 11 Nov – 20 Nov | 25 Nov | lead |",
        "| Cart totals | Done | 2 of 2 tracks | 12 Nov – 19 Nov | 20 Nov | ann |",
        "",
      ].join("\n"),
    );
  });

  it("REQ-REPORTS-037 No risks and failed detail: None. and — for Verdict, Planned and Forecast", () => {
    const text = summaryMarkdown(
      input({
        report: statusReport({ epics: [statusEpic("e-1", { title: "Team checkout", child_counts: { ...closedCounts, total: 0, closed: 0 } })] }),
        detail: null,
        forecast: null,
      }),
    );
    expect(text).toContain("## Risks\n\nNone.\n");
    expect(text).toContain("| Team checkout | — | Not split yet | — | — | lead |");
  });

  it("REQ-REPORTS-037 Escapes | and newlines in cell text", () => {
    const text = summaryMarkdown(
      input({ report: statusReport({ epics: [statusEpic("e-1", { title: "Pay | refund\nflow", person: "a|b" })] }), detail: null, forecast: null }),
    );
    expect(text).toContain("| Pay \\| refund flow |");
    expect(text).toContain("| a\\|b |");
  });

  it("REQ-REPORTS-037 Lists more-blocked, unestimated and unapproved-spec risks", () => {
    const text = summaryMarkdown(
      input({
        report: statusReport({
          risks: { blocked: [], blocked_more: 2, unestimated: [{ id: "u-1", title: "Receipts" }, { id: "u-2", title: "Loyalty" }] },
        }),
        detail: detail([epicPlan("e-1", { title: "Team checkout", spec_confirmed: false })]),
      }),
    );
    expect(text).toContain("- 2 more blocked beads\n");
    expect(text).toContain("- 2 epics have no estimate: Receipts, Loyalty\n");
    expect(text).toContain("- 1 of 1 epics: spec not approved yet: Team checkout\n");
  });
});
