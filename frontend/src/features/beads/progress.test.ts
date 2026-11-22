import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { countsOf, prepLabel, prepWords, progressOf } from "./progress";

// REQ-UI-130
describe("progress", () => {
  const e = bead("e", { child_counts: { total: 5, closed: 3, prep_total: 3, prep_closed: 1 } });

  it("REQ-UI-130 progressOf reads the child counts of the bead", () => {
    expect(progressOf(e)).toEqual({ done: 3, total: 5, prepDone: 1, prepTotal: 3, counts: { done: 3, inProgress: 0, blocked: 0, ready: 2, deferred: 0 } });
  });

  it("REQ-UI-130 prepLabel is x/y and prepWords says x of y done", () => {
    expect(prepLabel(progressOf(e))).toBe("Prep 1/3");
    expect(prepWords(progressOf(e))).toBe("Prep 1 of 3 done");
  });

  it("REQ-UI-130 progressOf takes the states of the child counts when the API sends them", () => {
    const counts = { total: 7, closed: 2, prep_total: 0, prep_closed: 0, in_progress: 1, blocked: 1, ready: 3, deferred: 0 };
    expect(progressOf(bead("e", { child_counts: counts })).counts).toEqual({ done: 2, inProgress: 1, blocked: 1, ready: 3, deferred: 0 });
  });

  it("REQ-UI-112 countsOf counts lane tracks by state", () => {
    const tracks = [bead("a", { status: "closed" }), bead("b", { status: "closed" }), bead("c", { status: "in_progress" }), bead("d", { ready: true })];
    expect(countsOf(tracks)).toEqual({ done: 2, inProgress: 1, blocked: 0, ready: 1, deferred: 0 });
  });

  it("REQ-UI-130 a bead without children has zero progress", () => {
    expect(progressOf(bead("t"))).toEqual({ done: 0, total: 0, prepDone: 0, prepTotal: 0, counts: { done: 0, inProgress: 0, blocked: 0, ready: 0, deferred: 0 } });
  });
});
