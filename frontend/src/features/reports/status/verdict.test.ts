import { describe, expect, it } from "vitest";
import { statusKpis, statusMilestones, statusReport } from "./statusFixtures";
import { paceFinish, statusVerdict } from "./verdict";

const m1 = statusMilestones[0];
const m2 = statusMilestones[1];
const m3 = statusMilestones[2];

describe("paceFinish", () => {
  it("REQ-REPORTS-027 rounds open / pace up in working days and returns null when pace is 0 or none open", () => {
    expect(paceFinish("2026-11-23", 20, 2.0)).toBe("2026-12-07");
    expect(paceFinish("2026-11-23", 10, 2.0)).toBe("2026-11-30");
    expect(paceFinish("2026-11-23", 5, 2.0)).toBe("2026-11-26"); // ceil(2.5) = 3 working days
    expect(paceFinish("2026-11-23", 12, 0)).toBeNull();
    expect(paceFinish("2026-11-23", 12, null)).toBeNull();
    expect(paceFinish("2026-11-23", 0, 2.0)).toBeNull();
  });
});

describe("statusVerdict", () => {
  it("REQ-REPORTS-027 Late by the forecast", () => {
    const report = statusReport({
      today: "2026-11-23",
      kpis: statusKpis({
        beads: { done: 10, scope: 20, done_week_ago: 5, scope_week_ago: 20 },
        pace: { pace: 2.0, pace_needed: 1.5, pace_week_ago: 2.0 },
        blocked: { count: 0, oldest_days: null },
      }),
    });
    const verdict = statusVerdict(report, m2, "2027-02-17", 0);
    expect(verdict.word).toBe("Late");
    expect(verdict.tone).toBe("late");
    expect(verdict.glyph).toBe("blocked");
    expect(verdict.dashed).toBe(false);
  });

  it("REQ-REPORTS-027 At risk with both dates", () => {
    const report = statusReport({
      today: "2026-11-23",
      kpis: statusKpis({
        beads: { done: 15, scope: 35, done_week_ago: 7, scope_week_ago: 32 },
        pace: { pace: 2.0, pace_needed: 2.8, pace_week_ago: 1.4 },
        blocked: { count: 1, oldest_days: 4 },
      }),
    });
    const verdict = statusVerdict(report, m2, "2026-11-30", 4);
    expect(verdict.word).toBe("At risk");
    expect(verdict.tone).toBe("risk");
    expect(verdict.glyph).toBe("deferred");
    expect(verdict.dashed).toBe(true);
    expect(verdict.paceFinish).toBe("2026-12-07");
    expect(verdict.sentence).toBe(
      "At today's pace the 20 open beads close around 7 Dec, 3 working days after the end. The epic estimates finish on 30 Nov; 4 epics are not split into tasks yet.",
    );
  });

  it("REQ-REPORTS-027 On track", () => {
    const longEnd = { ...m2, end: "2026-12-11" };
    const report = statusReport({
      today: "2026-11-23",
      milestones: [m1, longEnd, m3],
      kpis: statusKpis({
        beads: { done: 20, scope: 30, done_week_ago: 10, scope_week_ago: 30 },
        pace: { pace: 2.0, pace_needed: 1.0, pace_week_ago: 2.0 },
        blocked: { count: 0, oldest_days: null },
      }),
      risks: { blocked: [], blocked_more: 0, unestimated: [] },
    });
    const verdict = statusVerdict(report, longEnd, "2026-12-04", 0);
    expect(verdict.word).toBe("On track");
    expect(verdict.tone).toBe("good");
    expect(verdict.glyph).toBe("done");
    expect(verdict.dashed).toBe(false);
    expect(verdict.sentence).toBe(
      "At today's pace the 10 open beads close around 30 Nov, 9 working days before the end. The epic estimates finish on 4 Dec.",
    );
  });

  it("REQ-REPORTS-027 Nothing closed lately", () => {
    const report = statusReport({
      today: "2026-11-23",
      kpis: statusKpis({
        beads: { done: 8, scope: 20, done_week_ago: 8, scope_week_ago: 20 },
        pace: { pace: 0, pace_needed: 1.5, pace_week_ago: 0 },
        blocked: { count: 0, oldest_days: null },
      }),
    });
    const verdict = statusVerdict(report, m2, null, 0);
    expect(verdict.word).toBe("At risk");
    expect(verdict.tone).toBe("risk");
    expect(verdict.paceFinish).toBeNull();
    expect(verdict.sentence).toBe("No bead closed in the last 5 working days; 12 beads are open.");
  });

  it("REQ-REPORTS-027 Not started and finished", () => {
    const plannedReport = statusReport({
      today: "2026-11-23",
      milestone: "m3",
      burnup: [],
      kpis: statusKpis({ points: { done: null, scope: null, at_kickoff: null, done_week_ago: null } }),
      epics: [
        { id: "e-8", title: "A", status: "open", points: 8, person: "ann", closed_on: null, child_counts: { total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 } },
        { id: "e-9", title: "B", status: "open", points: 5, person: "bao", closed_on: null, child_counts: { total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 } },
      ],
    });
    const notStarted = statusVerdict(plannedReport, m3, null, 2);
    expect(notStarted.word).toBe("Not started");
    expect(notStarted.tone).toBe("idle");
    expect(notStarted.glyph).toBe("ready");
    expect(notStarted.sentence).toBe("Starts on 18 Dec, with 13 points planned.");

    const closedReport = statusReport({ today: "2026-11-23", milestone: "m1" });
    const finishedLate = statusVerdict(closedReport, m1, null, 0);
    expect(finishedLate.word).toBe("Finished 2 d late");
    expect(finishedLate.tone).toBe("late");
    expect(finishedLate.glyph).toBe("blocked");
    expect(finishedLate.sentence).toBe("Closed on 3 Nov, 2 working days after the end.");

    const onTime = { ...m1, closed_on: "2026-10-30" };
    const finishedOnTime = statusVerdict(closedReport, onTime, null, 0);
    expect(finishedOnTime.word).toBe("Finished on time");
    expect(finishedOnTime.tone).toBe("good");
    expect(finishedOnTime.glyph).toBe("done");
    expect(finishedOnTime.sentence).toBe("Closed on 30 Oct.");
  });

  it("REQ-REPORTS-027 Forecast not loaded", () => {
    const report = statusReport({
      today: "2026-11-23",
      kpis: statusKpis({
        beads: { done: 10, scope: 14, done_week_ago: 5, scope_week_ago: 14 },
        pace: { pace: 2.0, pace_needed: 0.5, pace_week_ago: 2.0 },
        blocked: { count: 0, oldest_days: null },
      }),
    });
    const verdict = statusVerdict(report, m2, null, 0);
    expect(verdict.word).toBe("On track");
    expect(verdict.sentence).not.toContain("epic estimates");
  });

  it("REQ-REPORTS-027 All beads done on an open milestone", () => {
    const report = statusReport({
      today: "2026-11-23",
      kpis: statusKpis({
        beads: { done: 14, scope: 14, done_week_ago: 10, scope_week_ago: 14 },
        pace: { pace: 2.0, pace_needed: 0, pace_week_ago: 2.0 },
        blocked: { count: 0, oldest_days: null },
      }),
    });
    const verdict = statusVerdict(report, m2, null, 0);
    expect(verdict.word).toBe("On track");
    expect(verdict.sentence).toBe("All 14 beads are done.");
  });
});
