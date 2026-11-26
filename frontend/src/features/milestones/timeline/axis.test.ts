import { describe, expect, it } from "vitest";
import { dayOf } from "../gantt";
import { closedEpic, entry, forecast, forecastEpic, forecastMilestone, list } from "../milestoneFixtures";
import { DAY_WIDTH, spanOf, ticksOf, timelineGroups, xOfDay, zoomOf, type EpicRow, type Group } from "./axis";

const ids = (groups: Group[]) => groups.map((g) => (g.kind === "none" ? "none" : g.id));
const rowsOf = (groups: Group[], id: string): EpicRow[] => groups.find((g) => (g.kind === "none" ? id === "none" : g.id === id))?.epics ?? [];
const milestoneOf = (groups: Group[], id: string) => {
  const found = groups.find((g) => g.kind === "milestone" && g.id === id);
  if (found === undefined || found.kind !== "milestone") throw new Error(`no group ${id}`);
  return found;
};

describe("timelineGroups", () => {
  it("REQ-MILESTONE-UI-035 milestone and its epics: window, overrun, finish and the bar name", () => {
    const e13 = forecastEpic("ex-e13", {
      title: "Multi-currency pricing",
      milestone: "ex-m2",
      planned_start: "2026-12-11",
      planned_end: "2027-02-02",
      remaining_days: 38,
      lane: 1,
      warnings: [{ code: "overflow", days: 42, count: null }],
    });
    const groups = timelineGroups(
      list([entry("ex-m2", { start: "2026-11-16", end: "2026-12-04", status: "active" })], {
        forecast: forecast({ epics: [e13], milestones: [forecastMilestone("ex-m2", { start: "2026-12-11", finish: "2027-07-02" })] }),
      }),
      false,
    );
    expect(ids(groups)).toEqual(["ex-m2"]);
    const group = milestoneOf(groups, "ex-m2");
    expect(group.window).toEqual({ from: "2026-11-16", to: "2026-12-04" });
    expect(group.overrun).toEqual({ from: "2026-12-05", to: "2027-07-02" });
    expect(group.finish).toBe("2027-07-02");
    expect(group.noOpenEpics).toBe(false);
    expect(group.status).toBe("active");
    expect(group.epics).toEqual([
      {
        kind: "epic",
        id: "ex-e13",
        title: "Multi-currency pricing",
        status: "open",
        closed: false,
        bar: { from: "2026-12-11", to: "2027-02-02" },
        lane: 1,
        remaining: 38,
        over: 42,
        assumed: false,
        warned: true,
        label: "Multi-currency pricing: planned 11 Dec – 2 Feb, 38 days left, 42 days over",
      },
    ]);
  });

  it("REQ-MILESTONE-UI-035 no overrun when the chained finish is not after the end", () => {
    const groups = timelineGroups(
      list([entry("m1", { start: "2026-11-02", end: "2026-12-18" })], {
        forecast: forecast({ milestones: [forecastMilestone("m1", { finish: "2026-12-18" })] }),
      }),
      false,
    );
    expect(milestoneOf(groups, "m1").overrun).toBeNull();
    expect(milestoneOf(groups, "m1").finish).toBe("2026-12-18");
  });

  it("REQ-MILESTONE-UI-035 the label names missing days left and days over by leaving them out", () => {
    const epic = forecastEpic("e-1", { title: "Search", planned_start: "2026-11-02", planned_end: "2026-11-03", remaining_days: null, estimate_source: null });
    const groups = timelineGroups(list([], { forecast: forecast({ epics: [epic] }) }), false);
    expect(rowsOf(groups, "none")[0]).toMatchObject({ label: "Search: planned 2 Nov – 3 Nov", remaining: null, over: null, assumed: false });
    const one = forecastEpic("e-2", { title: "One", planned_start: "2026-11-02", planned_end: "2026-11-03", remaining_days: 1 });
    expect(rowsOf(timelineGroups(list([], { forecast: forecast({ epics: [one] }) }), false), "none")[0].label).toBe("One: planned 2 Nov – 3 Nov, 1 day left");
  });

  it("REQ-MILESTONE-UI-035 not in a milestone: 13 epics, in the order of the forecast, and nothing else", () => {
    const epics = Array.from({ length: 13 }, (_, n) => forecastEpic(`e-${13 - n}`));
    const closed = ["m0a", "m0b", "m1"].map((id) => entry(id, { status: "closed" }));
    const groups = timelineGroups(list(closed, { forecast: forecast({ epics }) }), false);
    expect(ids(groups)).toEqual(["none"]);
    expect(rowsOf(groups, "none").map((e) => e.id)).toEqual(epics.map((e) => e.id));
  });

  it("REQ-MILESTONE-UI-035 an epic naming no listed milestone goes to Not in a milestone, and the group is left out when empty", () => {
    const groups = timelineGroups(
      list([entry("m1")], { forecast: forecast({ epics: [forecastEpic("e-1", { milestone: "m1" }), forecastEpic("e-2", { milestone: "ghost" })] }) }),
      false,
    );
    expect(ids(groups)).toEqual(["m1", "none"]);
    expect(rowsOf(groups, "none").map((e) => e.id)).toEqual(["e-2"]);
    const allPlaced = timelineGroups(list([entry("m1")], { forecast: forecast({ epics: [forecastEpic("e-1", { milestone: "m1" })] }) }), false);
    expect(ids(allPlaced)).toEqual(["m1"]);
  });

  it("REQ-MILESTONE-UI-035 order of groups: closed, then the chained ones in forecast order, then other open ones by start, then none", () => {
    const milestones = [
      entry("m4", { start: "2027-02-01", end: "2027-02-12" }),
      entry("m3", { start: "2026-12-14", end: "2026-12-25" }),
      entry("m0", { status: "closed", start: "2026-10-01", end: "2026-10-30" }),
      entry("m2", { start: "2026-11-02", end: "2026-12-11" }),
      entry("m5", { start: "2027-01-04", end: "2027-01-15" }),
      entry("m6", { start: null, end: null }),
    ];
    const groups = timelineGroups(
      list(milestones, {
        forecast: forecast({
          epics: [forecastEpic("e-1", { milestone: null })],
          milestones: [forecastMilestone("m2"), forecastMilestone("m3")],
        }),
      }),
      true,
    );
    expect(ids(groups)).toEqual(["m0", "m2", "m3", "m5", "m4", "none"]);
  });

  it("REQ-MILESTONE-UI-035 a milestone of the chain that is listed closed shows once, with the closed ones", () => {
    const groups = timelineGroups(
      list([entry("m1", { status: "closed", start: "2026-10-01", end: "2026-10-30" }), entry("m2")], {
        forecast: forecast({ milestones: [forecastMilestone("m1"), forecastMilestone("m2")] }),
      }),
      true,
    );
    expect(ids(groups)).toEqual(["m1", "m2"]);
  });
});

describe("timelineGroups, closed history", () => {
  const example = () =>
    list(
      [
        entry("ex-m0b", { status: "closed", start: "2026-10-05", end: "2026-10-16", finish: "2026-10-13" }),
        entry("ex-m0a", { status: "closed", start: "2026-09-21", end: "2026-10-02", finish: "2026-10-01" }),
        entry("ex-m1", { status: "closed", start: "2026-10-19", end: "2026-11-13", finish: "2026-11-10" }),
        entry("ex-m2", { start: "2026-11-16", end: "2026-12-04" }),
      ],
      {
        forecast: forecast({
          epics: [forecastEpic("ex-e13", { milestone: "ex-m2" })],
          milestones: [forecastMilestone("ex-m2", { finish: "2026-12-03" })],
        }),
        closed_epics: [
          closedEpic("ex-e2", { title: "Checkout", milestone: "ex-m1", start: "2026-10-12", end: "2026-10-28" }),
          closedEpic("ex-e0", { title: "Stray", milestone: null, start: "2026-10-01", end: "2026-10-02" }),
        ],
      },
    );

  it("REQ-MILESTONE-UI-037 show closed: closed milestones first by start, with their finish and closed epic rows", () => {
    const groups = timelineGroups(example(), true);
    expect(ids(groups)).toEqual(["ex-m0a", "ex-m0b", "ex-m1", "ex-m2", "none"]);
    expect(milestoneOf(groups, "ex-m0b").finish).toBe("2026-10-13");
    expect(milestoneOf(groups, "ex-m0b").window).toEqual({ from: "2026-10-05", to: "2026-10-16" });
    expect(milestoneOf(groups, "ex-m0b").overrun).toBeNull();
    expect(rowsOf(groups, "ex-m1")).toEqual([
      {
        kind: "epic",
        id: "ex-e2",
        title: "Checkout",
        status: "closed",
        closed: true,
        bar: { from: "2026-10-12", to: "2026-10-28" },
        lane: null,
        remaining: null,
        over: null,
        assumed: false,
        warned: false,
        label: "Checkout: 12 Oct – 28 Oct, closed",
      },
    ]);
    expect(rowsOf(groups, "none").map((e) => e.id)).toEqual(["ex-e0"]);
  });

  it("REQ-MILESTONE-UI-037 closed epic rows come before the open ones of the group", () => {
    const base = example();
    const withBoth = {
      ...base,
      forecast: forecast({ epics: [forecastEpic("open-1", { milestone: "ex-m2" })], milestones: [forecastMilestone("ex-m2")] }),
      closed_epics: [closedEpic("done-1", { milestone: "ex-m2" })],
    };
    expect(rowsOf(timelineGroups(withBoth, true), "ex-m2").map((e) => [e.id, e.closed])).toEqual([
      ["done-1", true],
      ["open-1", false],
    ]);
  });

  it("REQ-MILESTONE-UI-037 off by default: no closed milestone and no closed epic", () => {
    const groups = timelineGroups(example(), false);
    expect(ids(groups)).toEqual(["ex-m2"]);
    expect(groups.flatMap((g) => g.epics).some((e) => e.closed)).toBe(false);
  });

  it("REQ-MILESTONE-UI-037 closed epics unavailable (null): closed milestones show, no closed epic row", () => {
    const groups = timelineGroups({ ...example(), closed_epics: null }, true);
    expect(ids(groups)).toEqual(["ex-m0a", "ex-m0b", "ex-m1", "ex-m2"]);
    expect(groups.flatMap((g) => g.epics).some((e) => e.closed)).toBe(false);
  });
});

describe("timelineGroups, states", () => {
  it("REQ-MILESTONE-UI-038 a milestone whose chained entry has no start and no finish has no open epics", () => {
    const groups = timelineGroups(
      list([entry("ex-m4", { start: "2027-01-04", end: "2027-01-15" })], {
        forecast: forecast({ milestones: [forecastMilestone("ex-m4", { start: null, finish: null })] }),
      }),
      false,
    );
    const group = milestoneOf(groups, "ex-m4");
    expect(group.noOpenEpics).toBe(true);
    expect(group.window).toEqual({ from: "2027-01-04", to: "2027-01-15" });
    expect(group.finish).toBeNull();
    expect(group.overrun).toBeNull();
  });

  it("REQ-MILESTONE-UI-038 an assumed estimate is flagged and named in the label", () => {
    const epic = forecastEpic("ex-e12", { title: "Reports", estimate_source: "assumed", planned_start: "2026-11-02", planned_end: "2026-11-06", remaining_days: 5 });
    const [row] = rowsOf(timelineGroups(list([], { forecast: forecast({ epics: [epic] }) }), false), "none");
    expect(row.assumed).toBe(true);
    expect(row.label).toBe("Reports: planned 2 Nov – 6 Nov, 5 days left, assumed estimate");
  });

  it("REQ-MILESTONE-UI-038 with a forecast error: milestone bars without overrun, no open epic rows", () => {
    const groups = timelineGroups(
      list([entry("m1", { start: "2026-11-02", end: "2026-11-13" })], {
        forecast: forecast({
          error: "gin failed",
          epics: [forecastEpic("e-1", { milestone: "m1" }), forecastEpic("e-2")],
          milestones: [forecastMilestone("m1", { finish: "2026-12-31" })],
        }),
        closed_epics: [closedEpic("done-1", { milestone: "m1" })],
      }),
      true,
    );
    expect(ids(groups)).toEqual(["m1"]);
    expect(milestoneOf(groups, "m1").overrun).toBeNull();
    expect(rowsOf(groups, "m1").map((e) => e.id)).toEqual(["done-1"]);
  });

  it("REQ-MILESTONE-UI-038 without a forecast: milestones still show, with no chain, no epic rows and no overrun", () => {
    const only = list([entry("m0", { status: "closed", start: "2026-10-01", end: "2026-10-30", finish: "2026-10-28" })], { closed_epics: [closedEpic("e-1", { milestone: "m0" })] });
    expect(timelineGroups(only, false)).toEqual([]);
    const groups = timelineGroups(only, true);
    expect(ids(groups)).toEqual(["m0"]);
    expect(milestoneOf(groups, "m0").finish).toBe("2026-10-28");
    expect(rowsOf(groups, "m0").map((e) => e.id)).toEqual(["e-1"]);
  });

  it("REQ-MILESTONE-UI-035 an open milestone outside the chain shows its window without a finish", () => {
    const groups = timelineGroups(list([entry("m9", { start: "2027-03-01", end: "2027-03-12", finish: "2027-03-10" })], { forecast: forecast() }), false);
    const group = milestoneOf(groups, "m9");
    expect([group.finish, group.overrun, group.noOpenEpics]).toEqual([null, null, false]);
  });
});

describe("zoom and axis", () => {
  it("REQ-MILESTONE-UI-036 zoom: a day is 24, 6 or 2px wide; Months unless the URL says otherwise", () => {
    expect(DAY_WIDTH).toEqual({ weeks: 24, months: 6, quarters: 2 });
    expect(zoomOf("weeks")).toBe("weeks");
    expect(zoomOf("quarters")).toBe("quarters");
    expect(zoomOf("months")).toBe("months");
    expect(zoomOf(null)).toBe("months");
    expect(zoomOf("years")).toBe("months");
  });

  it("REQ-MILESTONE-UI-036 xOfDay: one equal step per day from the first day", () => {
    const first = dayOf("2026-11-26");
    expect(xOfDay(first, first, "months")).toBe(0);
    expect(xOfDay(dayOf("2026-12-11"), first, "months")).toBe(15 * 6);
    expect(xOfDay(dayOf("2026-12-11"), first, "weeks")).toBe(15 * 24);
    expect(xOfDay(dayOf("2026-12-11"), first, "quarters")).toBe(15 * 2);
  });

  const labels = (zoom: "weeks" | "months" | "quarters", from: string, to: string) => ticksOf(zoom, dayOf(from), dayOf(to)).map((t) => t.label);

  it("REQ-MILESTONE-UI-036 weeks across a year end: each Monday, without the year", () => {
    expect(labels("weeks", "2026-12-21", "2027-01-15")).toEqual(["21 Dec", "28 Dec", "4 Jan", "11 Jan"]);
    const ticks = ticksOf("weeks", dayOf("2026-12-23"), dayOf("2027-01-05"));
    expect(ticks.map((t) => t.label)).toEqual(["28 Dec", "4 Jan"]);
    expect(ticks[0].day).toBe(dayOf("2026-12-28"));
  });

  it("REQ-MILESTONE-UI-036 months: the first day itself, then each 1st; the year on the first tick and on January", () => {
    expect(labels("months", "2026-11-26", "2027-03-10")).toEqual(["Nov 2026", "Dec", "Jan 2027", "Feb", "Mar"]);
    const ticks = ticksOf("months", dayOf("2026-12-01"), dayOf("2027-01-31"));
    expect(ticks.map((t) => t.label)).toEqual(["Dec 2026", "Jan 2027"]);
    expect(ticks.map((t) => t.day)).toEqual([dayOf("2026-12-01"), dayOf("2027-01-01")]);
  });

  it("REQ-MILESTONE-UI-036 quarters: Q4 2026 then Q1 2027; the first day opens with its quarter", () => {
    expect(labels("quarters", "2026-11-26", "2027-05-01")).toEqual(["Q4 2026", "Q1 2027", "Q2 2027"]);
    expect(ticksOf("quarters", dayOf("2026-11-26"), dayOf("2027-05-01")).map((t) => t.day)).toEqual([dayOf("2026-11-26"), dayOf("2027-01-01"), dayOf("2027-04-01")]);
    expect(labels("quarters", "2026-10-01", "2026-12-31")).toEqual(["Q4 2026"]);
  });
});

describe("spanOf", () => {
  const groups = timelineGroups(
    list([entry("m1", { start: "2026-11-16", end: "2026-12-04" })], {
      forecast: forecast({ epics: [forecastEpic("e-1", { milestone: "m1", planned_start: "2026-12-01", planned_end: "2026-12-20" })], milestones: [forecastMilestone("m1", { finish: "2026-12-30" })] }),
    }),
    false,
  );

  it("REQ-MILESTONE-UI-036 span: from the earliest bar start to the latest bar end, finish, deadline and today", () => {
    expect(spanOf(groups, null, "2026-11-20")).toEqual({ first: dayOf("2026-11-16"), last: dayOf("2026-12-30") });
    expect(spanOf(groups, forecast({ finish: "2027-01-19", deadline: null }), "2026-11-20").last).toBe(dayOf("2027-01-19"));
    expect(spanOf(groups, forecast({ finish: "2026-12-22", deadline: "2027-02-11" }), "2026-11-20").last).toBe(dayOf("2027-02-11"));
  });

  it("REQ-MILESTONE-UI-036 span: today is always inside, before or after the bars", () => {
    expect(spanOf(groups, null, "2026-11-01").first).toBe(dayOf("2026-11-01"));
    expect(spanOf(groups, null, "2027-03-01").last).toBe(dayOf("2027-03-01"));
  });

  it("REQ-MILESTONE-UI-036 span without bars is the day of today", () => {
    expect(spanOf([], null, "2026-11-26")).toEqual({ first: dayOf("2026-11-26"), last: dayOf("2026-11-26") });
  });
});
