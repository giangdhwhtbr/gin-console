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
  labelledDays,
  labelWidthOf,
  markerSides,
  middleOf,
  monthsOf,
  openingDay,
  rowsOf,
  sortEpics,
  stepDay,
  tailWidth,
  showsSpec,
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
    expect(warningLines(epicPlan("a", { warnings: [{ code: "overflow", days: 2, count: null }] }), today, null)).toEqual([
      "2 working days past the end",
    ]);
    expect(warningLines(epicPlan("a", { warnings: [{ code: "overflow", days: 1, count: null }] }), today, null)).toEqual([
      "1 working day past the end",
    ]);
    expect(warningLines(epicPlan("a", { warnings: [{ code: "late", days: null, count: null }] }), today, null)).toEqual([
      "Late: should have finished 4 Nov",
    ]);
    expect(warningLines(epicPlan("a", { warnings: [{ code: "unestimated", days: null, count: null }] }), today, null)).toEqual(["No estimate"]);
    expect(warningLines(epicPlan("a", { warnings: [{ code: "spec_not_ready", days: null, count: null }] }), today, null)).toEqual(["Spec not confirmed"]);
    const blocked = epicPlan("a", {
      warnings: [{ code: "external_blocker", days: null, count: null }],
      external_depends_on: [
        { id: "E9", milestone: "M2" },
        { id: "X1", milestone: null },
      ],
    });
    expect(warningLines(blocked, today, null)).toEqual(["Blocked by E9 (in M2)", "Blocked by X1 (not in a milestone)"]);
  });

  it("REQ-MILESTONE-UI-003 newer warnings", () => {
    const today = "2026-10-29";
    const lines = (code: string, extra: { days?: number; count?: number } = {}) =>
      warningLines(epicPlan("a", { warnings: [{ code, days: extra.days ?? null, count: extra.count ?? null }] }), today, "2026-11-24");
    expect(lines("spec_due")).toEqual(["Spec due before kick-off"]);
    expect(lines("after_integration")).toEqual(["Ends after integration on 24 Nov"]);
    expect(lines("open_bugs", { count: 2 })).toEqual(["2 open bugs"]);
    expect(lines("open_bugs", { count: 1 })).toEqual(["1 open bug"]);
    expect(lines("oversized", { days: 3 })).toEqual(["3 working days longer than the milestone"]);
    expect(lines("oversized", { days: 1 })).toEqual(["1 working day longer than the milestone"]);
    expect(lines("brand_new")).toEqual(["brand_new"]);
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
      epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-02", warnings: [{ code: "unestimated", days: null, count: null }] }),
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

  it("REQ-MILESTONE-UI-013 below lg a row holds a line per label and warning; from lg it keeps 56", () => {
    const epics = [
      epicPlan("a", { spec_confirmed: false, warnings: [{ code: "unestimated", days: null, count: null }, { code: "spec_not_ready", days: null, count: null }] }),
      epicPlan("b"),
    ];
    const heights = (wide: boolean) => rowsOf(epics, "2026-10-29", new Set(), new Map(), wide).map((r) => [r.top, r.height]);
    // 24 + title, id and period lines of 16 = 72 (no spec line: the warnings say it), plus 2 warnings of 18
    expect(heights(false)).toEqual([[0, 108], [108, 72]]);
    expect(heights(true)).toEqual([[0, 92], [92, 56]]);
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

  it("REQ-MILESTONE-UI-013 label column width by window", () => {
    expect([390, 1023, 1024, 1279, 1280, 1599, 1600, 2560].map(labelWidthOf)).toEqual([168, 168, 300, 300, 380, 380, 440, 440]);
  });

  it("REQ-MILESTONE-UI-013 tail title stops before the next end or today line, else the chart edge", () => {
    expect(tailWidth(100, [160, 400], 500)).toBe(44); // 60px to the end line, a gap on each side
    expect(tailWidth(100, [90, 400], 500)).toBe(284); // a line behind the bar end does not count
    expect(tailWidth(100, [], 500)).toBe(384);
    expect(tailWidth(100, [105], 500)).toBe(0);
  });

  it("REQ-MILESTONE-UI-013 the End chip keeps off the chart edge and off the Today chip", () => {
    expect(markerSides(null, 300, 1000)).toEqual({ today: "right", end: "right", todayShift: 0 });
    expect(markerSides(null, 950, 1000)).toEqual({ today: "right", end: "left", todayShift: 0 });
    expect(markerSides(280, 300, 1000)).toMatchObject({ today: "left", end: "right", todayShift: 0 });
    expect(markerSides(100, 300, 1000)).toMatchObject({ today: "right", end: "right" });
  });

  it("REQ-MILESTONE-UI-013 Today and End chips never intersect, wherever Today falls", () => {
    const interval = (x: number, side: "left" | "right", w: number, shift = 0): [number, number] =>
      side === "right" ? [x + 4, x + 4 + w] : [x - shift - 4 - w, x - shift - 4];
    for (const endX of [300, 800, 900, 950, 998]) {
      for (let t = 0; t <= 1000; t += 4) {
        const m = markerSides(t, endX, 1000);
        const a = interval(t, m.today, 44, m.todayShift);
        const b = interval(endX, m.end, 100);
        expect(a[0] < b[1] && b[0] < a[1], `today ${t} end ${endX}`).toBe(false);
      }
    }
    expect(markerSides(940, 950, 1000)).toMatchObject({ today: "left", end: "left" });
    expect(markerSides(940, 950, 1000).todayShift).toBeGreaterThan(0);
    expect(markerSides(300, 300, 1000)).toMatchObject({ today: "left", end: "right", todayShift: 0 }); // Today on the End line
  });

  it("REQ-MILESTONE-UI-013 no spec item when the warnings already say it is not confirmed", () => {
    const warn = [{ code: "spec_not_ready", days: null, count: null }];
    expect(showsSpec(epicPlan("a", { spec_confirmed: false }))).toBe(true);
    expect(showsSpec(epicPlan("a", { spec_confirmed: false, warnings: warn }))).toBe(false);
    expect(showsSpec(epicPlan("a", { spec_confirmed: null }))).toBe(false);
    // only spec_not_ready drops it: spec_due and the other warnings keep it
    const due = [{ code: "spec_due", days: null, count: null }, { code: "late", days: null, count: null }];
    expect(showsSpec(epicPlan("a", { spec_confirmed: false, warnings: due }))).toBe(true);
  });
});

describe("labelledDays (REQ-UI-110, REQ-MILESTONE-UI-013)", () => {
  const plan = detail([], { start: "2026-11-02", end: "2026-12-04", schedule_start: "2026-11-02", finish: null });
  const need = 2 * 6.5 + 6;
  const shown = (width: number) => {
    const axis = axisOf(plan, width);
    const set = labelledDays(axis);
    return { axis, set, cols: axis.columns.filter((c) => set.has(c.day)) };
  };

  it("labels every working day when a column fits a number and a gap", () => {
    const { axis, set } = shown(20);
    expect(set.size).toBe(axis.columns.filter((c) => !c.weekend).length);
  });

  for (let width = 8; width <= 60; width += 1) {
    it(`keeps the numbers apart at a ${width}px column`, () => {
      const { axis, cols } = shown(width);
      expect(cols.length).toBeGreaterThan(0);
      expect(cols.every((c) => !c.weekend)).toBe(true);
      expect(set1(axis, cols[0].day)).toBe(true); // the first day of the plan is the first of its month in view
      const labelWidth = width >= 56 ? 6 * 6.5 + 6 : need;
      for (let i = 1; i < cols.length; i += 1) {
        const gap = cols[i].x + cols[i].width / 2 - (cols[i - 1].x + cols[i - 1].width / 2);
        expect(gap).toBeGreaterThanOrEqual(labelWidth);
      }
    });
  }

  it("thins out step by step as columns narrow", () => {
    const counts = [60, 20, 18, 12, 9, 8].map((w) => shown(w).cols.length);
    for (let i = 1; i < counts.length; i += 1) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    expect(counts[2]).toBeLessThan(counts[1]);
  });

  it("labels Mondays only when every 2nd day does not fit", () => {
    const { cols } = shown(8);
    expect(cols.filter((c) => new Date(c.day * 86_400_000).getUTCDay() !== 1).every((c) => c.iso.endsWith("-01") || c.iso === "2026-12-01")).toBe(true);
  });

  it("keeps the first working day of each month", () => {
    for (const width of [8, 12, 18]) {
      const { set } = shown(width);
      expect(set.has(dayOf("2026-11-02"))).toBe(true);
      expect(set.has(dayOf("2026-12-01"))).toBe(true);
    }
  });
});

const set1 = (axis: ReturnType<typeof axisOf>, day: number) => axis.columns.some((c) => c.day === day);
