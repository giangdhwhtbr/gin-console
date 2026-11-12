import { describe, expect, it } from "vitest";
import { figures, gapCount, headlines, teamHeadline } from "./headlines";
import { teamReport, teamTotals } from "./team/teamFixtures";
import { report } from "./reportFixtures";

const base = report();
const bead = (id: string) => ({ project: "alpha", id, title: id, detail: "" });

describe("report headlines", () => {
  it("REQ-UI-095 headlines", () => {
    const r = report({
      totals: { ...base.totals, closed: 41, tokens: 12_400_000, cost: 38.2, rework_rate: 0.09 },
      coverage: { ...base.coverage, not_collected: [bead("a"), bead("b"), bead("c")], invalid: [bead("d")], unpriced: ["m"] },
    });
    expect(headlines(r)).toEqual({
      delivery: { text: "41 beads closed", warn: false },
      usage: { text: "12.4M tokens, $38.20", warn: false },
      quality: { text: "9% rework", warn: false },
      coverage: { text: "5 gaps", warn: true },
    });
  });
  it("REQ-UI-095 no price, no rate, one gap, no gaps", () => {
    const r = report({ totals: { ...base.totals, cost: null, rework_rate: null }, errors: [{ project: "beta", error: "x" }] });
    expect(headlines(r).usage.text).toBe("51.1M tokens, no price");
    expect(headlines(r).quality.text).toBe("— rework");
    expect(headlines(r).coverage).toEqual({ text: "1 gap", warn: true });
    expect(gapCount(base)).toBe(0);
    expect(headlines(base).coverage).toEqual({ text: "0 gaps", warn: false });
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
    expect(teamHeadline({ ...t, milestone: "m1" })).toEqual({ text: "Finished 2 d late", warn: true });
    const onTime = { ...t, milestones: t.milestones.map((m) => (m.id === "m1" ? { ...m, closed_on: "2026-10-30" } : m)), milestone: "m1" };
    expect(teamHeadline(onTime)).toEqual({ text: "Finished on time", warn: false });
    expect(teamHeadline({ ...t, milestone: "m3" })).toEqual({ text: "Starts 30 Nov", warn: false });
    expect(teamHeadline({ ...t, team: { ...team, closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 } })).toEqual({ text: "27 of 64 closed · on pace", warn: false });
    expect(teamHeadline({ ...t, team: { ...team, closed: 27, scope: 64, pace: 3.4, pace_needed: 3.6 } })).toEqual({ text: "27 of 64 closed · behind pace", warn: true });
    expect(teamHeadline({ ...t, team: { ...team, closed: 27, scope: 64, late_open: 2 } })).toEqual({ text: "27 of 64 closed · past end", warn: true });
    expect(teamHeadline({ ...t, milestones: [], milestone: null, team: null })).toEqual({ text: "No milestones", warn: false });
    expect(figures("team", base)).toEqual([]);
  });
  it("REQ-UI-089 usage figures", () => {
    expect(figures("usage", base)).toEqual([["Tokens", "51.1M"], ["Estimated cost", "$12.34"], ["Tokens per closed bead", "12.8M"], ["Cache reads", "90%"]]);
  });
  it("REQ-UI-091 quality figures", () => {
    const row = { project: null, title: null, rejections: 0, waivers: 0, findings: { critical: 0, important: 0, minor: 0, suggestion: 0 }, rework_rate: 0 };
    const r = report({
      quality: { ...base.quality, members: [{ ...row, key: "ann", beads: 4, reopens: 1, bugs: 0, review_cycles: 5 }, { ...row, key: "bao", beads: 1, reopens: 0, bugs: 1, review_cycles: 1 }] },
    });
    expect(figures("quality", r)).toEqual([["Rework rate", "25%"], ["Reopens", "1"], ["Bugs found later", "1"], ["Review cycles per bead", "1.2"]]);
    expect(figures("quality", base)[3]).toEqual(["Review cycles per bead", "—"]);
    expect(figures("coverage", base)).toEqual([]);
  });
});
