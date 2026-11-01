import { describe, expect, it } from "vitest";
import { bead } from "@/features/beads/beadFixtures";
import {
  axisOf,
  beadsOf,
  chainOf,
  childrenOf,
  dayAt,
  dayOf,
  dependencyArrows,
  endOf,
  fitDayWidth,
  isoOf,
  middleOf,
  monthsOf,
  openingDay,
  rowsOf,
  sortEpics,
  stepDay,
  warningLines,
  xOf,
  zoomOf,
} from "./gantt";
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

  it("REQ-MILESTONE-UI-011 zoom from the URL; anything else is the whole milestone", () => {
    expect([zoomOf("1w"), zoomOf("2w"), zoomOf(null), zoomOf("3w")]).toEqual(["1w", "2w", "all", "all"]);
  });

  it("REQ-MILESTONE-UI-011 days fill the width, weekends narrow, never under the floor", () => {
    const [mon, sun] = [dayOf("2026-11-02"), dayOf("2026-11-08")];
    expect(fitDayWidth(mon, sun, 660, 24)).toBe((660 - 2 * 8) / 5);
    expect(fitDayWidth(mon, dayOf("2026-11-06"), 660, 14)).toBe(132);
    expect(fitDayWidth(mon, mon + 69, 660, 14)).toBe(14);
    expect(fitDayWidth(dayOf("2026-11-07"), sun, 660, 24)).toBe(24);
  });

  it("REQ-MILESTONE-UI-011 a zoomed axis covers whole Monday-to-Sunday weeks", () => {
    const plan = detail([epicPlan("a", { planned_start: "2026-11-04", planned_end: "2026-11-11" })], {
      start: "2026-11-04",
      schedule_start: "2026-11-04",
      end: "2026-11-11",
      finish: "2026-11-11",
    });
    expect([isoOf(axisOf(plan, 28).first), isoOf(axisOf(plan, 28).last)]).toEqual(["2026-11-04", "2026-11-11"]);
    const zoomed = axisOf(plan, 28, "1w");
    expect([isoOf(zoomed.first), isoOf(zoomed.last)]).toEqual(["2026-11-02", "2026-11-15"]);
    expect(isoOf(dayAt(zoomed, xOf(zoomed, dayOf("2026-11-09")) + 0.5))).toBe("2026-11-09");
    expect(isoOf(dayAt(zoomed, 1e6))).toBe("2026-11-15");
  });

  it("REQ-MILESTONE-UI-011 opens on the Monday of today's week, or of the plan's first day", () => {
    const long = detail([epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-27" })], {
      end: "2026-11-27",
      finish: "2026-11-27",
      today: "2026-11-11",
    });
    expect(isoOf(openingDay(long, axisOf(long, 28, "2w")))).toBe("2026-11-09");
    const later = detail([epicPlan("a", { planned_start: "2026-11-04", planned_end: "2026-11-06" })], {
      start: "2026-11-04",
      schedule_start: "2026-11-04",
      finish: "2026-11-06",
      today: "2026-10-29",
    });
    expect(isoOf(openingDay(later, axisOf(later, 28, "1w")))).toBe("2026-11-02");
  });

  it("REQ-MILESTONE-UI-012 steps snap to Monday and stay on the axis", () => {
    const plan = detail([epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-27" })], { end: "2026-11-27", finish: "2026-11-27" });
    const axis = axisOf(plan, 28, "2w"); // 2026-11-02 to 2026-11-29
    const step = (from: string, direction: 1 | -1, span: number) => isoOf(stepDay(axis, dayOf(from), direction, span));
    expect(step("2026-11-02", 1, 14)).toBe("2026-11-16");
    expect(step("2026-11-11", 1, 7)).toBe("2026-11-16");
    expect(step("2026-11-11", -1, 7)).toBe("2026-11-09");
    expect(step("2026-11-16", -1, 14)).toBe("2026-11-02");
    expect(step("2026-11-09", -1, 14)).toBe("2026-11-02");
    expect(step("2026-11-23", 1, 14)).toBe("2026-11-29");
  });

  it("REQ-MILESTONE-UI-014 arrows between epics of the milestone only, late in the blocked color", () => {
    const epics = [
      epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-02" }),
      epicPlan("b", { planned_start: "2026-11-03", planned_end: "2026-11-03", depends_on: ["a", "x"] }),
      epicPlan("c", { planned_start: "2026-11-09", planned_end: "2026-11-09", depends_on: ["a"] }),
      epicPlan("d", { planned_start: "2026-11-09", planned_end: "2026-11-09", depends_on: ["c"] }),
    ];
    const axis = axisOf(detail(epics), 28);
    const arrows = dependencyArrows(rowsOf(epics, "2026-10-29", new Set(), new Map()), axis);
    expect(arrows).toEqual([
      { from: "a", to: "b", path: "M25 28 H28 V56 H20 V84 H31", late: false },
      { from: "a", to: "c", path: "M25 28 H28 V140 H159", late: false },
      { from: "c", to: "d", path: "M181 140 H184 V168 H148 V196 H159", late: true },
    ]);
  });

  it("REQ-MILESTONE-UI-014 arrows follow rows moved by warnings and expanded children", () => {
    const epics = [
      epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-02", warnings: [{ code: "unestimated", days: null }] }),
      epicPlan("b", { planned_start: "2026-11-09", planned_end: "2026-11-09", depends_on: ["a"] }),
    ];
    const children = new Map([["a", [bead("a.1"), bead("a.2")]]]);
    const rows = rowsOf(epics, "2026-10-29", new Set(["a"]), children);
    expect(rows.map((r) => [r.kind, r.top, r.height])).toEqual([
      ["epic", 0, 74],
      ["child", 74, 36],
      ["child", 110, 36],
      ["epic", 146, 56],
    ]);
    expect(dependencyArrows(rows, axisOf(detail(epics), 28))[0].path).toBe("M25 28 H28 V174 H159");
  });

  it("REQ-MILESTONE-UI-014 the chain runs upstream and downstream, not to siblings", () => {
    const epics = [
      epicPlan("a"),
      epicPlan("b", { depends_on: ["a"] }),
      epicPlan("c", { depends_on: ["b", "x"] }),
      epicPlan("d"),
      epicPlan("e", { depends_on: ["a"] }),
    ];
    expect([...chainOf(epics, "b")].sort()).toEqual(["a", "b", "c"]);
    expect([...chainOf(epics, "a")].sort()).toEqual(["a", "b", "c", "e"]);
    expect([...chainOf(epics, "d")]).toEqual(["d"]);
  });

  it("REQ-MILESTONE-UI-015 children by parent, ordered by id", () => {
    const byParent = childrenOf([bead("e.10", { parent: "e" }), bead("e.2", { parent: "e" }), bead("f.1", { parent: "f" }), bead("g")]);
    expect(byParent.get("e")?.map((b) => b.id)).toEqual(["e.2", "e.10"]);
    expect([...byParent.keys()].sort()).toEqual(["e", "f"]);
  });
});
