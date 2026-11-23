import { describe, expect, it } from "vitest";
import type { MilestoneOption } from "./api";
import {
  isClosedMilestone,
  matchesMilestone,
  milestoneGroups,
  milestoneInEffect,
  milestoneValue,
  type MilestonesState,
} from "./milestoneChoice";

const option = (id: string, status: MilestoneOption["status"]): MilestoneOption => ({
  id,
  title: id,
  status,
  start: null,
  end: null,
});
const ok = (current: string | null): MilestonesState => ({
  status: "ok",
  data: { milestones: [option("m1", "closed"), option("m2", "active")], current },
});

describe("milestoneChoice", () => {
  it("REQ-UI-104 an empty URL value gives the current milestone", () => {
    expect(milestoneInEffect("", ok("m2"))).toBe("m2");
  });
  it("REQ-UI-104 no current milestone gives all", () => {
    expect(milestoneInEffect("", ok(null))).toBe("all");
  });
  it("REQ-UI-104 all and none are kept, a listed id is kept", () => {
    expect(milestoneInEffect("none", ok("m2"))).toBe("none");
    expect(milestoneInEffect("all", ok("m2"))).toBe("all");
    expect(milestoneInEffect("m1", ok("m2"))).toBe("m1");
  });
  it("REQ-UI-104 an unknown id gives all", () => {
    expect(milestoneInEffect("zzz", ok("m2"))).toBe("all");
  });
  it("REQ-UI-104 loading and error give all", () => {
    expect(milestoneInEffect("", { status: "error" })).toBe("all");
    expect(milestoneInEffect("", { status: "loading" })).toBe("all");
    expect(milestoneInEffect("m2", { status: "error" })).toBe("all");
  });
  it("REQ-UI-104 only a listed closed id is closed", () => {
    expect(isClosedMilestone("m1", ok("m2"))).toBe(true);
    expect(isClosedMilestone("m2", ok("m2"))).toBe(false);
    expect(isClosedMilestone("all", ok("m2"))).toBe(false);
    expect(isClosedMilestone("m1", { status: "error" })).toBe(false);
  });
  it("REQ-UI-043 none matches a bead without a milestone, an id matches equality", () => {
    expect(matchesMilestone({ milestone: null }, "none")).toBe(true);
    expect(matchesMilestone({ milestone: "m1" }, "none")).toBe(false);
    expect(matchesMilestone({ milestone: "m1" }, "m1")).toBe(true);
    expect(matchesMilestone({ milestone: "m2" }, "m1")).toBe(false);
    expect(matchesMilestone({ milestone: null }, "all")).toBe(true);
  });
  it("REQ-UI-104 groups: Active, Planned by start, Closed by latest end, empty groups left out", () => {
    const m = (id: string, status: MilestoneOption["status"], start: string, end: string): MilestoneOption => ({ id, title: id, status, start, end });
    const groups = milestoneGroups([m("c1", "closed", "2026-01-01", "2026-02-01"), m("c2", "closed", "2026-03-01", "2026-04-01"), m("p2", "planned", "2026-08-01", "2026-09-01"), m("p1", "scheduled", "2026-07-01", "2026-08-01")]);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([["Planned", ["p1", "p2"]], ["Closed", ["c2", "c1"]]]);
  });
  it("REQ-UI-144 the Milestone chip value: none for All, No milestone, else the title", () => {
    expect(milestoneValue("all", ok("m2"))).toBeNull();
    expect(milestoneValue("none", ok("m2"))).toBe("No milestone");
    expect(milestoneValue("m2", ok("m2"))).toBe("m2");
  });
});
