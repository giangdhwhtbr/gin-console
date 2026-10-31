import { describe, expect, it } from "vitest";
import { axisOf, beadsOf, dayOf, endOf, isoOf, middleOf, monthsOf, sortEpics, warningLines, xOf } from "./gantt";
import { detail, epicPlan } from "./milestoneFixtures";

const days = (epic: Parameters<typeof beadsOf>[0]) => beadsOf(epic).map(isoOf);

describe("gantt", () => {
  it("REQ-MILESTONE-UI-003 one column per day, weekends narrow", () => {
    const axis = axisOf(detail([epicPlan("a")]), 28); // 2026-11-02 (Mon) to 2026-11-13 (Fri)
    expect(axis.columns).toHaveLength(12);
    expect(axis.columns.filter((c) => c.weekend).map((c) => c.iso)).toEqual(["2026-11-07", "2026-11-08"]);
    expect(axis.width).toBe(10 * 28 + 2 * 8);
    expect(xOf(axis, dayOf("2026-11-09"))).toBe(5 * 28 + 2 * 8);
    expect(endOf(axis, dayOf("2026-11-04"))).toBe(3 * 28);
    expect(middleOf(axis, dayOf("2026-11-04"))).toBe(2 * 28 + 14);
    expect(middleOf(axis, dayOf("2026-12-25"))).toBeNull();
  });

  it("REQ-MILESTONE-UI-003 the axis reaches the latest epic, finish and schedule start", () => {
    const plan = detail([epicPlan("a", { planned_start: "2026-11-16", planned_end: "2026-11-20" })], {
      schedule_start: "2026-11-16",
      finish: "2026-11-20",
    });
    const axis = axisOf(plan, 20);
    expect([isoOf(axis.first), isoOf(axis.last)]).toEqual(["2026-11-02", "2026-11-20"]);
  });

  it("REQ-MILESTONE-UI-003 one bead per working day; weekend skipped; unestimated is one bead", () => {
    expect(days(epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-04" }))).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
    expect(days(epicPlan("a", { planned_start: "2026-11-05", planned_end: "2026-11-09" }))).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-09",
    ]);
    expect(days(epicPlan("u", { estimate_days: null, planned_start: "2026-11-02", planned_end: "2026-11-02" }))).toEqual([
      "2026-11-02",
    ]);
  });

  it("REQ-MILESTONE-UI-003 dates do not move with the browser's timezone", () => {
    expect(isoOf(dayOf("2026-03-29"))).toBe("2026-03-29");
    expect(dayOf("2026-11-03") - dayOf("2026-11-02")).toBe(1);
  });

  it("REQ-MILESTONE-UI-003 warnings read as sentences", () => {
    const today = "2026-10-29";
    expect(warningLines(epicPlan("a", { warnings: [{ code: "overflow", days: 2 }] }), today)).toEqual([
      "2 working days past the end",
    ]);
    expect(warningLines(epicPlan("a", { warnings: [{ code: "overflow", days: 1 }] }), today)).toEqual([
      "1 working day past the end",
    ]);
    expect(warningLines(epicPlan("a", { warnings: [{ code: "late", days: null }] }), today)).toEqual([
      "Late: should have finished 4 Nov",
    ]);
    expect(warningLines(epicPlan("a", { warnings: [{ code: "unestimated", days: null }] }), today)).toEqual(["No estimate"]);
    const blocked = epicPlan("a", {
      warnings: [{ code: "external_blocker", days: null }],
      external_depends_on: [
        { id: "E9", milestone: "M2" },
        { id: "X1", milestone: null },
      ],
    });
    expect(warningLines(blocked, today)).toEqual(["Blocked by E9 (in M2)", "Blocked by X1 (not in a milestone)"]);
  });

  it("REQ-MILESTONE-UI-003 months and row order", () => {
    const plan = detail([epicPlan("b", { planned_start: "2026-11-03" }), epicPlan("a")], {
      schedule_start: "2026-10-29",
      start: "2026-10-29",
    });
    expect(monthsOf(axisOf(plan, 28), "2026-10-29").map((m) => m.label)).toEqual(["Oct", "Nov"]);
    expect(sortEpics(plan.epics).map((e) => e.id)).toEqual(["a", "b"]);
  });
});
