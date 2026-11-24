import { describe, expect, it } from "vitest";
import { figures, headlines, teamHeadline, velocityHeadline } from "./headlines";
import { teamReport, teamTotals } from "./team/teamFixtures";
import { report } from "./reportFixtures";

const base = report();

describe("report headlines", () => {
  it("REQ-UI-095 velocity headline", () => {
    expect(velocityHeadline({ value: 1.44, measured_epics: 6, assumed: false })).toEqual({ text: "1.4 days per point", warn: false });
    expect(velocityHeadline({ value: 1, measured_epics: 0, assumed: true })).toEqual({ text: "1.0 days per point assumed", warn: false });
    expect(velocityHeadline(null)).toBeNull();
  });
  it("REQ-UI-095 headlines", () => {
    const r = report({ totals: { closed: 41, rework_rate: 0.09 } });
    expect(headlines(r)).toEqual({
      delivery: { text: "41 beads closed", warn: false },
      rework: { text: "9% rework", warn: false },
    });
  });
  it("REQ-UI-095 no rate reads a dash", () => {
    const r = report({ totals: { closed: 0, rework_rate: null } });
    expect(headlines(r).rework.text).toBe("— rework");
  });
  it("REQ-UI-090 delivery figures", () => {
    const r = report({
      delivery: { ...base.delivery, overall: { key: "all", cycle: { n: 2, median: 0.7, p85: 1 }, lead: null } },
    });
    expect(figures("delivery", r)).toEqual([["Beads closed", "4"], ["Median cycle time", "0.7 d"], ["Median lead time", "—"]]);
  });
  it("REQ-UI-095 team headline cases", () => {
    const t = teamReport();
    const team = teamTotals;
    expect(teamHeadline({ ...t, milestone: "m1" }, null)).toEqual({ text: "Finished 2 d late", warn: true });
    const onTime = { ...t, milestones: t.milestones.map((m) => (m.id === "m1" ? { ...m, closed_on: "2026-10-30" } : m)), milestone: "m1" };
    expect(teamHeadline(onTime, null)).toEqual({ text: "Finished on time", warn: false });
    expect(teamHeadline({ ...t, milestone: "m3" }, null)).toEqual({ text: "Starts 30 Nov", warn: false });
    expect(teamHeadline({ ...t, team: { ...team, closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 } }, null)).toEqual({ text: "27 of 64 done, on pace", warn: false });
    expect(teamHeadline({ ...t, team: { ...team, closed: 27, scope: 64, pace: 3.4, pace_needed: 3.6 } }, null)).toEqual({ text: "27 of 64 done, behind pace", warn: true });
    expect(teamHeadline({ ...t, milestones: [], milestone: null, team: null }, null)).toEqual({ text: "No milestones", warn: false });
    expect(figures("team", base)).toEqual([]);
    expect(figures("rework", base)).toEqual([]);
    expect(figures("status", base)).toEqual([]);
  });
  it("REQ-UI-095 period headlines: Team counts the members without Unassigned", () => {
    const t = teamReport({ milestone: null, period_days: 30 });
    const bao = { ...t.members[0], member: "bao" };
    expect(teamHeadline({ ...t, members: [t.members[0], bao, t.members[1]] }, null)).toEqual({ text: "2 members", warn: false });
    expect(teamHeadline(t, null)).toEqual({ text: "1 member", warn: false });
  });
  // REQ-MILESTONE-UI-023: late is by the end and the forecast, and behind pace never says late
  it("REQ-UI-095 late milestone headline: by the forecast, or by today after the end", () => {
    const t = teamReport();
    const team = { ...teamTotals, closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 };
    expect(teamHeadline({ ...t, team }, "2027-02-16")).toEqual({ text: "27 of 64 done, late", warn: true });
    expect(teamHeadline({ ...t, team }, "2026-11-27")).toEqual({ text: "27 of 64 done, on pace", warn: false });
    expect(teamHeadline({ ...t, team }, null)).toEqual({ text: "27 of 64 done, on pace", warn: false });
    const past = { ...t, today: "2026-11-30", team: { ...team, pace: 3.4, pace_needed: 3.6 } };
    expect(teamHeadline(past, null)).toEqual({ text: "27 of 64 done, late", warn: true });
  });
  it("REQ-MILESTONE-UI-023 a milestone closed on the weekend after its end is finished on time", () => {
    const t = teamReport();
    const weekend = { ...t, milestones: t.milestones.map((m) => (m.id === "m1" ? { ...m, end: "2026-10-30", closed_on: "2026-10-31" } : m)), milestone: "m1" };
    expect(teamHeadline(weekend, null)).toEqual({ text: "Finished on time", warn: false });
  });
});
